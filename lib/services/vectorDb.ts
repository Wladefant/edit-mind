import 'dotenv/config'
import { ChromaClient, Collection } from 'chromadb'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { EmbeddingInput, CollectionStatistics } from '../types/vector'
import { Video, VideoWithScenes } from '../types/video'
import { Scene } from '../types/scene'
import { SearchQuery } from '../types/search'
import { metadataToScene } from '../utils/embed'

const API_KEY = process.env.GEMINI_API_KEY

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost'
const CHROMA_PORT = process.env.CHROMA_PORT || '8000'
const COLLECTION_NAME = 'video_content'
const EMBEDDING_MODEL = 'text-embedding-004'

let client: ChromaClient | null = null
let collection: Collection | null = null

async function embedDocuments(documents: EmbeddingInput[]): Promise<void> {
  try {
    await initialize()
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable not set.')
    }
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })

    const ids: string[] = []
    const embeddings: number[][] = []
    const metadatas: Record<string, any>[] = []
    const documentTexts: string[] = []

    for (const doc of documents) {
      const result = await model.embedContent(doc.text)
      const embedding = result.embedding

      ids.push(doc.id)
      embeddings.push(embedding.values)
      metadatas.push(doc.metadata || {})
      documentTexts.push(doc.text)
    }

    await collection?.add({
      ids,
      embeddings,
      metadatas,
      documents: documentTexts,
    })
  } catch (error) {
    console.error('Error embedding documents:', error)
    throw error
  }
}

async function getStatistics(): Promise<CollectionStatistics> {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const count = await collection.count()

    const results = await collection.get({
      limit: count,
      include: ['metadatas', 'embeddings', 'documents'],
    })

    const metadataKeysSet = new Set<string>()
    results.metadatas?.forEach((metadata) => {
      if (metadata) {
        Object.keys(metadata).forEach((key) => metadataKeysSet.add(key))
      }
    })

    const embeddingDimension = results.embeddings && results.embeddings.length > 0 ? results.embeddings[0].length : null

    const statistics: CollectionStatistics = {
      name: COLLECTION_NAME,
      totalDocuments: count,
      embeddingDimension,
      metadataKeys: Array.from(metadataKeysSet),
      documentIds: results.ids || [],
    }

    return statistics
  } catch (error) {
    console.error('Error getting statistics:', error)
    throw error
  }
}

const initialize = async (): Promise<void> => {
  if (client && collection) {
    return
  }

  try {
    client = new ChromaClient({
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`,
    })

    await client.heartbeat()

    collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: undefined,
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'error',
        message: `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        hint: 'Make sure ChromaDB server is running. Start it with: docker run -p 8000:8000 chromadb/chroma',
      })
    )
    throw error
  }
}

const getAllVideos = async (): Promise<Video[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection.get({
      include: ['metadatas'],
    })

    const uniqueVideos: Record<string, Video> = {}

    if (allDocs && allDocs.metadatas) {
      for (const metadata of allDocs.metadatas) {
        if (!metadata) continue

        const source = metadata.source as string
        if (source && !uniqueVideos[source]) {
          uniqueVideos[source] = {
            source,
            duration: parseFloat(metadata.duration?.toString() || '0.00'),
            aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
            camera: metadata.camera?.toString() || 'N/A',
            category: metadata.category?.toString() || 'Uncategorized',
            createdAt: metadata.createdAt?.toString() || 'N/A',
          }
        }
      }
    }

    return Object.values(uniqueVideos)
  } catch (error) {
    console.error('Error getting all videos:', error)
    throw error
  }
}
const getAllVideosWithScenes = async (): Promise<VideoWithScenes[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection.get({
      include: ['metadatas', 'documents'],
    })

    const videosDict: Record<string, VideoWithScenes> = {}

    if (allDocs && allDocs.metadatas && allDocs.ids) {
      for (let i = 0; i < allDocs.metadatas.length; i++) {
        const metadata = allDocs.metadatas[i]
        if (!metadata) continue

        const source = metadata.source as string
        if (!source) continue

        if (!videosDict[source]) {
          videosDict[source] = {
            source,
            duration: parseFloat(metadata.duration?.toString() || '0.00'),
            aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
            camera: metadata.camera?.toString() || 'N/A',
            category: metadata.category?.toString() || 'Uncategorized',
            createdAt: metadata.createdAt?.toString() || 'N/A',
            scenes: [],
            sceneCount: 0,
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

        const scene: Scene = {
          id: allDocs.ids[i],
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
          source,
          camera: metadata.camera?.toString() || 'N/A',
        }

        videosDict[source].scenes.push(scene)
      }
    }

    const videosList: VideoWithScenes[] = []
    for (const video of Object.values(videosDict)) {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      videosList.push(video)
    }

    videosList.sort((a, b) => a.source.localeCompare(b.source))

    return videosList
  } catch (error) {
    console.error('Error getting all videos with scenes:', error)
    throw error
  }
}
const queryCollection = async (query: SearchQuery, nResults = 1000): Promise<Scene[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const conditions: Record<string, any>[] = []

    if (query.aspect_ratio) {
      const aspectRatioValues = Array.isArray(query.aspect_ratio) ? query.aspect_ratio : [query.aspect_ratio]
      conditions.push({ aspect_ratio: { $in: aspectRatioValues } })
    }
    if (query.camera) {
      const cameraValues = Array.isArray(query.camera) ? query.camera : [query.camera]
      conditions.push({ camera: { $in: cameraValues } })
    }
    if (query.shot_type) {
      conditions.push({ shot_type: query.shot_type })
    }

    let whereClause: Record<string, any> = {}

    if (conditions.length === 1) {
      whereClause = conditions[0]
    } else if (conditions.length > 1) {
      whereClause = { $and: conditions }
    }
    let result
    if (conditions.length === 0) {
      result = await collection.get({
        include: ['metadatas', 'documents'],
      })
    } else {
      result = await collection.get({
        where: whereClause,
        limit: nResults,
        include: ['metadatas', 'documents', 'embeddings'],
      })
    }

    let filteredScenes: Scene[] = result.metadatas.map((metadata, index) =>
      metadataToScene(metadata, result.ids![index])
    )

    if (result.metadatas && result.metadatas.length > 0 && result.ids && result.ids.length > 0) {
      filteredScenes = result.metadatas
        .map((metadata, index) => metadataToScene(metadata, result.ids![index]))
        .filter((scene) => {
          let matches = true

          // Filter by faces
          if (query.faces && query.faces.length > 0) {
            const sceneFaces = scene.faces.map((f) => f.toLowerCase())
            matches = matches && query.faces.some((qFace) => sceneFaces.includes(qFace.toLowerCase()))
          }

          // Filter by objects
          if (query.objects && query.objects.length > 0) {
            const sceneObjects = scene.objects.map((o) => o.toLowerCase())
            matches = matches && query.objects.some((qObject) => sceneObjects.includes(qObject.toLowerCase()))
          }

          // Filter by emotions
          if (query.emotions && query.emotions.length > 0) {
            const sceneEmotions = scene.emotions.map((e) => e.emotion.toLowerCase())
            matches = matches && query.emotions.some((qEmotion) => sceneEmotions.includes(qEmotion.toLowerCase()))
          }

          return matches
        })
    }

    return filteredScenes.slice(0, nResults)
  } catch (error) {
    console.error('Error querying collection:', error)
    throw error
  }
}

export { embedDocuments, getStatistics, initialize, getAllVideosWithScenes, getAllVideos, queryCollection }
