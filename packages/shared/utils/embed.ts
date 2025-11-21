import { createHash } from 'crypto'
import { DetectedTextData, FaceData, ObjectData, Scene, TranscriptionWord } from '../types/scene'
import { generateAllThumbnails, getCameraNameAndDate, getLocationFromVideo, getVideoMetadata } from './videos'
import fs from 'fs/promises'
import path from 'path'
import { embedDocuments } from '../services/vectorDb'
import { existsSync } from 'fs'
import { formatLocation, getLocationName } from './location'

import { EMBEDDING_BATCH_SIZE, THUMBNAILS_DIR } from '../constants'
import { extractGPS, getGoProDeviceName, getGoProVideoMetadata } from './gopro'
import { gcd } from '.'
import { getAspectRatioDescription } from './aspectRatio'

export const embedScenes = async (scenes: Scene[], videoFullPath: string, category?: string): Promise<void> => {
  const metadata = await getVideoMetadata(videoFullPath)

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

      const streamData = goproTelemetry['1']
      const gpsCoordinates = extractGPS(streamData || {})
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

      const embeddingInputs = batch.map(async (scene) => {
        scene.camera = initialCamera
        scene.createdAt = createdAt
        scene.location = location
        scene.aspect_ratio = aspectRatio
        scene.category = category
        scene.duration = duration
        return await sceneToVectorFormat(scene)
      })

      await embedDocuments(await Promise.all(embeddingInputs))
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
  let facesData: FaceData[] = []
  try {
    facesData = metadata.facesData ? JSON.parse(metadata.facesData as string) : []
  } catch (e) {
    console.warn('Failed to parse facesData:', e)
  }

  let objectsData: ObjectData[] = []
  try {
    objectsData = metadata.objectsData ? JSON.parse(metadata.objectsData as string) : []
  } catch (e) {
    console.warn('Failed to parse objectsData:', e)
  }

  let detectedTextData: DetectedTextData[] = []
  try {
    detectedTextData = metadata.detectedTextData ? JSON.parse(metadata.detectedTextData as string) : []
  } catch (e) {
    console.warn('Failed to parse detectedTextData:', e)
  }

  let transcriptionWords: TranscriptionWord[] = []
  try {
    transcriptionWords = metadata.transcriptionWords ? JSON.parse(metadata.transcriptionWords as string) : []
  } catch (e) {
    console.warn('Failed to parse transcriptionWords:', e)
  }

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
    detectedTextData,
    transcriptionWords,
    objectsData,
    facesData,
  }
}

const generateVectorDocumentText = async (scene: Scene) => {
  const faces = scene.faces?.join(', ') || ''
  const objects = scene.objects?.join(', ') || ''
  const emotionsText =
    scene.emotions
      ?.map((face) => (face.emotion ? `${face.name} is ${face.emotion}` : ''))
      .filter(Boolean)
      .join(', ') || ''
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const textParts: string[] = []

  if (scene.shot_type) {
    const shotTypeDescriptions: Record<string, string> = {
      'close-up': 'a close-up shot',
      'medium-shot': 'a medium-shot scene',
      'long-shot': 'a wide-angle scene',
    }
    textParts.push(`This is ${shotTypeDescriptions[scene.shot_type] || 'a ' + scene.shot_type}`)
  } else {
    textParts.push('This is a video scene')
  }

  if (faces) {
    const faceList = scene.faces || []
    if (faceList.length === 1) {
      textParts.push(`featuring ${faces}`)
    } else if (faceList.length === 2) {
      textParts.push(`featuring ${faceList[0]} and ${faceList[1]}`)
    } else if (faceList.length > 2) {
      const lastFace = faceList[faceList.length - 1]
      const otherFaces = faceList.slice(0, -1).join(', ')
      textParts.push(`featuring ${otherFaces}, and ${lastFace}`)
    }
  }

  if (scene.location) {
    const locationName = await getLocationName(scene.location)
    textParts.push(`in ${locationName || scene.location}`)
  }

  if (scene.description) {
    textParts.push(`. The scene depicts ${scene.description}`)
  }

  if (objects) {
    const objectList = scene.objects || []
    if (objectList.length === 1) {
      textParts.push(`. A ${objects} is visible in the scene`)
    } else if (objectList.length > 1) {
      textParts.push(`. Detected objects include ${objects}`)
    }
  }

  if (scene.camera) {
    textParts.push(`, captured with ${scene.camera}`)
  }

  if (emotionsText) {
    textParts.push(`. Emotional analysis indicates that ${emotionsText}`)
  }

  if (detectedText) {
    textParts.push(`. On-screen text displays: "${detectedText}"`)
  }

  if (scene.dominantColorName) {
    textParts.push(`. The scene has a ${scene.dominantColorName} color palette`)
  }

  if (scene.transcription) {
    textParts.push(`. The transcription reads: "${scene.transcription}"`)
  }
  if (scene.createdAt) {
    textParts.push(`, captured at ${scene.createdAt}`)
  }
  if (scene.aspect_ratio) {
    const aspectRatioDesc = getAspectRatioDescription(scene.aspect_ratio)
    textParts.push(` in ${aspectRatioDesc} format`)
  }
  if (scene.category) {
    textParts.push(` categorized as ${scene.category}`)
  }

  const text = textParts.join('').replace(/\s+/g, ' ').replace(/\.\./g, '.').trim()
  return text
}

export const sceneToVectorFormat = async (scene: Scene) => {
  const detectedText = Array.isArray(scene.detectedText) ? scene.detectedText.join(', ') : scene.detectedText || ''

  const text = await generateVectorDocumentText(scene)

  const metadata: Record<string, any> = {
    source: scene.source,
    thumbnailUrl: scene.thumbnailUrl || '',
    startTime: scene.startTime,
    endTime: scene.endTime,
    type: 'scene',
    faces: scene.faces.join(', '),
    objects: scene.objects.join(', '),
    transcription: scene.transcription || '',
    emotions: scene.emotions.map((e) => JSON.stringify(e)).join(', '),
    description: text,
    shot_type: scene.shot_type || 'long-shot',
    detectedText: detectedText,
    createdAt: scene.createdAt,
    location: scene.location,
    dominantColorHex: scene.dominantColorHex,
    dominantColorName: scene.dominantColorName,
    camera: scene.camera,
    duration: scene.duration,

    facesData: JSON.stringify(scene.facesData || []),
    objectsData: JSON.stringify(scene.objectsData || []),
    detectedTextData: JSON.stringify(scene.detectedTextData || []),
    transcriptionWords: JSON.stringify(scene.transcriptionWords || []),
  }

  return {
    id: scene.id || `${path.basename(scene.source)}_scene_${scene.startTime}_${scene.endTime}`,
    text,
    metadata,
  }
}
