import { createHash } from 'crypto'
import { Scene } from '../types/scene'
import { gcd } from '../utils'
import { generateThumbnail, getCameraNameAndDate, getVideoMetadata, THUMBNAILS_DIR } from './videos'
import fs from 'fs/promises'
import path from 'path'
import { embedDocuments } from '../services/vectorDb'

const CONCURRENT_THUMBNAILS = 10
const EMBEDDING_BATCH_SIZE = 200

export const embedScenes = async (
  scenes: Scene[],
  videoFullPath: string,
  videoName: string,
  category?: string
): Promise<void> => {
  const metadata = await getVideoMetadata(videoFullPath)

  const videoStream = metadata.streams.find((stream: any) => stream.codec_type === 'video')
  const duration = metadata.format.duration
  const { camera, createdAt } = await getCameraNameAndDate(videoFullPath)
  const aspectRatio =
    videoStream?.width && videoStream?.height
      ? `${videoStream.width / gcd(videoStream.width, videoStream.height)}:${
          videoStream.height / gcd(videoStream.width, videoStream.height)
        }`
      : 'N/A'

  await fs.mkdir(THUMBNAILS_DIR, { recursive: true })

  try {
    for (let i = 0; i < scenes.length; i += EMBEDDING_BATCH_SIZE) {
      const batch = scenes.slice(i, i + EMBEDDING_BATCH_SIZE)

      const thumbnailPromises: Promise<string[]>[] = []
      for (let j = 0; j < batch.length; j += CONCURRENT_THUMBNAILS) {
        const thumbnailBatch = batch.slice(j, j + CONCURRENT_THUMBNAILS)
        thumbnailPromises.push(
          Promise.all(
            thumbnailBatch.map(async (scene) => {
              const hash = createHash('sha256').update(`${videoFullPath}_${scene.startTime}`).digest('hex')
              const thumbnailFile = `${hash}.jpg`
              const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFile)

              try {
                await fs.access(thumbnailPath)
              } catch {
                await generateThumbnail(videoFullPath, thumbnailPath, scene.startTime)
              }
              scene.thumbnailUrl = thumbnailFile
              return thumbnailFile
            })
          )
        )
      }
      await Promise.all(thumbnailPromises)

      const embeddingInputs = batch.map((scene, index) => {
        const faces = scene.faces?.join(', ') || ''
        const objects = scene.objects?.join(', ') || ''
        const emotions =
          scene.emotions
            ?.map((face) => (face.emotion ? `${face.name} is ${face.emotion}` : ''))
            .filter(Boolean)
            .join(', ') || ''

        const text =
          `Scene with ${faces}, objects: ${objects}. Emotions: ${emotions}. ${scene.transcription || ''}`.trim()

        return {
          id: `${videoName}_scene_${i + index}`,
          text,
          metadata: {
            source: videoFullPath,
            duration,
            aspect_ratio: aspectRatio,
            camera,
            category: category || 'Uncategorized',
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
            createdAt,
          },
        }
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
  }
}
