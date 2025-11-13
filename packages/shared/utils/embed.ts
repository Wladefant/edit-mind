import { createHash } from 'crypto'
import { Scene } from '../types/scene'
import { generateAllThumbnails, getCameraNameAndDate, getLocationFromVideo, getVideoMetadata } from './videos'
import fs from 'fs/promises'
import path from 'path'
import { embedDocuments } from '../services/vectorDb'
import { existsSync } from 'fs'
import { formatLocation } from './location'

import { EMBEDDING_BATCH_SIZE } from '../constants'
import { extractGPS, getGoProDeviceName, getGoProVideoMetadata } from './gopro'
import { gcd } from '.'

export const embedScenes = async (scenes: Scene[], videoFullPath: string, category?: string): Promise<void> => {
  const metadata = await getVideoMetadata(videoFullPath)
  const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '/.thumbnails'

  const duration = metadata.duration
  const { latitude, longitude, altitude } = await getLocationFromVideo(videoFullPath)
  let location = formatLocation(latitude, longitude, altitude)

  const { camera, createdAt } = await getCameraNameAndDate(videoFullPath)
  const aspectRatio =
    metadata?.width && metadata?.height
      ? `${metadata.width / gcd(metadata.width, metadata.height)}:${
          metadata.height / gcd(metadata.width, metadata.height)
        }`
      : 'N/A'

  let initialCamera = camera
  if (initialCamera.toLocaleLowerCase().includes('gopro')) {
    const goproTelemetry = await getGoProVideoMetadata(videoFullPath)
    if (goproTelemetry) {
      initialCamera = getGoProDeviceName(goproTelemetry)

      const gpsCoordinates = extractGPS(goproTelemetry['1'] || {})
      if (gpsCoordinates.length > 0) {
        location = formatLocation(gpsCoordinates[0]?.lat, gpsCoordinates[0]?.lon, gpsCoordinates[0]?.alt)
      } else {
        console.warn(`No GPS data found in GoPro video: ${videoFullPath}`)
      }
    }
  }

  await fs.mkdir(THUMBNAILS_DIR, { recursive: true })

  try {
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const scenesData = batch.map((scene) => {
        const hash = createHash('sha256').update(`${videoFullPath}_${scene.startTime}`).digest('hex')
        const thumbnailFile = `${hash}.jpg`
        const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFile)

        scene.thumbnailUrl = path.basename(thumbnailFile)

        return {
          scene,
          thumbnailPath,
          exists: existsSync(thumbnailPath),
        }
      })

      const missing = scenesData.filter((s) => !s.exists)
      if (missing.length > 0) {
        await generateAllThumbnails(
          videoFullPath,
          missing.map((s) => s.scene.startTime),
          missing.map((s) => s.thumbnailPath)
        )
      }

      const embeddingInputs = batch.map((scene, index) => {
        scene.camera = initialCamera
        scene.createdAt = createdAt
        scene.location = location
        scene.aspect_ratio = aspectRatio
        scene.category = category
        scene.duration = duration
        return sceneToVectorFormat(scene, i + index)
      })

      await embedDocuments(embeddingInputs)
    }
  } catch (err) {
    console.error(err)
  }
}

export const metadataToScene = (metadata: Record<string, any> | null, id: string): Scene => {
  if (!metadata) {
    return {
      id: id,
      thumbnailUrl: '',
      startTime: 0,
      endTime: 0,
      faces: [],
      objects: [],
      transcription: '',
      description: '',
      shot_type: '',
      emotions: [],
      createdAt: '',
      source: '',
      camera: '',
      dominantColorName: '',
      dominantColorHex: '',
      detectedText: [],
      location: '',
      duration: 0,
    }
  }

  let emotions: Array<{ name: string; emotion: string }> = []
  try {
    const emotionsStr = metadata.emotions as string
    if (emotionsStr) {
      emotions = JSON.parse(emotionsStr)
    }
  } catch {
    emotions = []
  }

  const faces = metadata.faces
    ? (metadata.faces as string)
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : []
  const objects = metadata.objects
    ? (metadata.objects as string)
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : []
  const detectedText = metadata.detectedText
    ? (metadata.detectedText as string)
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : []
  return {
    id: id,
    thumbnailUrl: metadata.thumbnailUrl?.toString() || '',
    startTime: parseInt(metadata.startTime?.toString() || '0') || 0,
    endTime: parseInt(metadata.endTime?.toString() || '0') || 0,
    faces,
    objects,
    transcription: metadata.transcription?.toString() || '',
    description: metadata.description?.toString() || '',
    shot_type: metadata.shot_type?.toString() || '',
    emotions,
    createdAt: metadata.createdAt?.toString() || 'N/A',
    source: metadata.source?.toString() || '',
    camera: metadata.camera?.toString() || 'N/A',
    dominantColorHex: metadata.dominantColor?.toString() || metadata.dominantColorHex?.toString() || 'N/A',
    dominantColorName: metadata.dominantColorName?.toString() || 'N/A',
    detectedText,
    location: metadata.location?.toString() || 'N/A',
    duration: metadata.duration,
  }
}

export const sceneToVectorFormat = (scene: Scene, sceneIndex: number) => {
  const faces = scene.faces?.join(', ') || ''
  const objects = scene.objects?.join(', ') || ''
  const emotionsText =
    scene.emotions
      ?.map((face) => (face.emotion ? `${face.name} is ${face.emotion}` : ''))
      .filter(Boolean)
      .join(', ') || ''
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const text =
    `Scene with ${faces}, objects: ${objects}. Emotions: ${emotionsText}. ${scene.transcription || ''}`.trim()

  const metadata: Record<string, any> = {
    source: scene.source,
    thumbnailUrl: scene.thumbnailUrl || '',
    startTime: scene.startTime,
    endTime: scene.endTime,
    type: 'scene',
    faces: Array.isArray(scene.faces) ? scene.faces.join(', ') : JSON.stringify(scene.faces || []),
    objects: Array.isArray(scene.objects) ? scene.objects.join(', ') : JSON.stringify(scene.objects || []),
    transcription: scene.transcription || '',
    emotions: Array.isArray(scene.emotions)
      ? scene.emotions.map((e) => JSON.stringify(e)).join(', ')
      : JSON.stringify(scene.emotions || []),
    description: scene.description || '',
    shot_type: scene.shot_type || 'long-shot',
    detectedText: detectedText,
    createdAt: scene.createdAt,
    location: scene.location,
    dominantColorHex: scene.dominantColorHex,
    dominantColorName: scene.dominantColorName,
    camera: scene.camera,
    duration: scene.duration,
  }

  return {
    id: `${path.basename(scene.source)}_scene_${sceneIndex}`,
    text,
    metadata,
  }
}
