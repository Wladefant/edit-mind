import { ChromaClient, Collection, Where, WhereDocument } from 'chromadb'
import { EmbeddingInput, CollectionStatistics } from '../types/vector'
import { Video, VideoWithScenes } from '../types/video'
import { Scene } from '../types/scene'
import { SearchQuery, VideoMetadataSummary } from '../types/search'
import { metadataToScene, sceneToVectorFormat } from '../utils/embed'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME } from '../constants'

let client: ChromaClient | null = null
let collection: Collection | null = null

const initialize = async (name: string = COLLECTION_NAME): Promise<void> => {
  if (client && collection) return

  try {
    client = new ChromaClient({
      path: `http://${CHROMA_HOST}:${CHROMA_PORT}`,
    })

    await client.heartbeat()

    collection = await client.getOrCreateCollection({
      name,
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

async function embedDocuments(documents: EmbeddingInput[]): Promise<void> {
  try {
    await initialize()
    if (!collection) throw new Error('Collection not initialized')

    const ids = documents.map((d) => d.id)
    const metadatas = documents.map((d) => d.metadata || {})
    const documentTexts = documents.map((d) => d.text)

    await collection.add({
      ids,
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
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
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
const getAllVideosWithScenes = async (
  limit = 20,
  offset = 0
): Promise<{ videos: VideoWithScenes[]; allSources: string[] }> => {
  await initialize()
  if (!collection) throw new Error('Collection not initialized')

  const allSources = await getUniqueVideoSources()
  const paginatedSources = allSources.slice(offset, offset + limit)

  const allDocs = await collection.get({
    where: { source: { $in: paginatedSources } },
    include: ['metadatas', 'documents', 'embeddings'],
  })

  const videosDict: Record<string, VideoWithScenes> = {}

  for (let i = 0; i < allDocs.metadatas.length; i++) {
    const metadata = allDocs.metadatas[i]
    if (!metadata) continue

    // Normalize source (avoid ./, whitespace, case issues)
    const source = metadata.source
      ?.toString()
      .trim()
      .replace(/^\.?\//, '')
    if (!source) continue

    if (!videosDict[source]) {
      videosDict[source] = {
        source,
        duration: parseFloat(metadata.duration?.toString() || '0.00'),
        aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
        camera: metadata.camera?.toString() || 'N/A',
        category: metadata.category?.toString() || 'Uncategorized',
        createdAt: metadata.createdAt?.toString() || new Date().toISOString(),
        scenes: [],
        sceneCount: 0,
        thumbnailUrl: metadata.thumbnailUrl?.toString(),
      }
    }

    const scene: Scene = metadataToScene(metadata, allDocs.ids[i])
    videosDict[source].scenes.push(scene)
  }

  const videosList = Object.values(videosDict).map((video) => {
    video.scenes.sort((a, b) => a.startTime - b.startTime)
    video.sceneCount = video.scenes.length
    return video
  })

  // Deduplicate (safety measure) & sort by creation date
  const uniqueVideos = Object.values(
    videosList.reduce(
      (acc, video) => {
        acc[video.source] = video
        return acc
      },
      {} as Record<string, VideoWithScenes>
    )
  )

  uniqueVideos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { videos: uniqueVideos, allSources }
}

const queryCollection = async (query: SearchQuery, nResults = 100): Promise<VideoWithScenes[]> => {
  try {
    await initialize()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const conditions: Where[] = []

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
    if (query.faces && query.faces.length > 0) {
      conditions.push({ faces: { $in: query.faces.map((f) => f.toLowerCase()) } })
    }
    if (query.objects && query.objects.length > 0) {
      conditions.push({ objects: { $in: query.objects.map((o) => o.toLowerCase()) } })
    }
    if (query.emotions && query.emotions.length > 0) {
      conditions.push({ emotions: { $in: query.emotions.map((e) => e.toLowerCase()) } })
    }
    if (query.transcriptionQuery) {
      conditions.push({ transcription: { $in: [query.transcriptionQuery] } })
    }
    if (query.detectedText) {
      conditions.push({ detectedText: { $in: [query.detectedText] } })
    }

    let whereClause: Where | WhereDocument = {}

    if (conditions.length === 1) {
      whereClause = conditions[0]
    } else if (conditions.length > 1) {
      whereClause = { $and: conditions }
    }

    const result = await collection.get({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      limit: nResults,
      include: ['metadatas', 'documents', 'embeddings'],
    })

    const videosDict: Record<string, VideoWithScenes> = {}

    if (result && result.metadatas && result.ids) {
      for (let i = 0; i < result.metadatas.length; i++) {
        const metadata = result.metadatas[i]
        if (!metadata) continue

        const source = metadata.source?.toString()
        if (!source) {
          continue
        }

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
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
          }
        }

        const scene: Scene = metadataToScene(metadata, result.ids[i])
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
    console.error('Error querying collection:', error)
    throw error
  }
}

async function filterExistingVideos(videoSources: string[]): Promise<string[]> {
  if (videoSources.length === 0) {
    return []
  }
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const results = await collection.get({
      where: {
        source: {
          $in: videoSources,
        },
      },
      include: ['metadatas'],
    })

    const existingSources = new Set(results.metadatas.map((m) => m!.source))
    return videoSources.filter((source) => !existingSources.has(source))
  } catch (error) {
    console.error('Error filtering existing videos:', error)
    return videoSources
  }
}

async function getByVideoSource(videoSource: string): Promise<Scene[]> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const result = await collection.get({
      where: {
        source: {
          $in: [videoSource],
        },
      },
      include: ['metadatas'],
    })
    const filteredScenes: Scene[] = result.metadatas.map((metadata, index) =>
      metadataToScene(metadata, result.ids![index])
    )
    return filteredScenes
  } catch (error) {
    console.error('Error filtering existing videos:', error)
    return []
  }
}

async function updateDocuments(scene: Scene): Promise<void> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const existing = await collection.get({
      where: {
        $and: [{ source: scene?.source }, { startTime: scene?.startTime }, { endTime: scene?.endTime }],
      },
      include: ['metadatas', 'documents', 'embeddings'],
    })

    if (!existing.ids || existing.ids.length === 0) {
      console.warn(`Document ${scene.id} not found, skipping`)
      return
    }

    await collection.update({
      ids: [scene.id],
      metadatas: [
        {
          ...sceneToVectorFormat(scene, scene.id).metadata,
        },
      ],
    })
  } catch (error) {
    console.error('Error updating documents:', error)
    throw error
  }
}

async function getVideosMetadataSummary(): Promise<VideoMetadataSummary> {
  await initialize()
  if (!collection) throw new Error('Collection not initialized')

  try {
    const allDocs = await collection.get({
      include: ['metadatas'],
    })

    const facesCount: Record<string, number> = {}
    const colorsCount: Record<string, number> = {}
    const emotionsCount: Record<string, number> = {}
    const shotTypesCount: Record<string, number> = {}
    const objectsCount: Record<string, number> = {}
    const cameraCount: Record<string, number> = {}

    allDocs.metadatas?.forEach((metadata) => {
      if (!metadata) return
      const scene = metadataToScene(metadata, '')

      // Faces
      scene.faces?.forEach((f: string) => {
        const name = f.toLowerCase()
        facesCount[name] = (facesCount[name] || 0) + 1
      })

      // Colors
      scene.colors?.forEach((c: string) => {
        const name = c.toLowerCase()
        colorsCount[name] = (colorsCount[name] || 0) + 1
      })

      // Emotions
      scene.emotions?.forEach((e: string) => {
        const name = e.toLowerCase()
        emotionsCount[name] = (emotionsCount[name] || 0) + 1
      })

      // Shot types
      if (scene.shot_type) {
        const name = scene.shot_type.toLowerCase()
        shotTypesCount[name] = (shotTypesCount[name] || 0) + 1
      }
      if (scene.camera) {
        const name = scene.camera.toLowerCase()
        cameraCount[name] = (cameraCount[name] || 0) + 1
      }

      // Objects
      scene.objects?.forEach((o: string) => {
        const name = o.toLowerCase()
        objectsCount[name] = (objectsCount[name] || 0) + 1
      })
    })

    const getTop = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => ({ name, count: 1 }))

    return {
      topFaces: getTop(facesCount),
      topColors: getTop(colorsCount),
      topEmotions: getTop(emotionsCount),
      shotTypes: getTop(shotTypesCount),
      topObjects: getTop(objectsCount),
      cameras: getTop(cameraCount),
    }
  } catch (error) {
    console.error('Error aggregating metadata from DB:', error)
    throw error
  }
}
async function updateMetadata(metadata: Scene): Promise<void> {
  await updateDocuments(metadata)
}
async function getVideoWithScenesBySceneIds(sceneIds: string[]): Promise<VideoWithScenes[]> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    if (sceneIds.length === 0) {
      return []
    }

    // Get documents by scene IDs
    const result = await collection.get({
      ids: sceneIds,
      include: ['metadatas', 'documents', 'embeddings'],
    })

    const videosDict: Record<string, VideoWithScenes> = {}

    if (result && result.metadatas && result.ids) {
      for (let i = 0; i < result.metadatas.length; i++) {
        const metadata = result.metadatas[i]
        if (!metadata) continue

        const source = metadata.source?.toString()
        if (!source) {
          continue
        }

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
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
          }
        }

        const scene: Scene = metadataToScene(metadata, result.ids[i])
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
    console.error('Error getting videos with scenes by scene IDs:', error)
    throw error
  }
}

async function getCollectionCount(): Promise<number> {
  await initialize()
  return await collection!.count()
}

async function getUniqueVideoSources(): Promise<string[]> {
  await initialize()
  if (!collection) throw new Error('Collection not initialized')

  const allDocs = await collection.get({ include: ['metadatas'] })

  const uniqueSources = new Set<string>()
  allDocs.metadatas?.forEach((metadata) => {
    const source = metadata?.source
      ?.toString()
      .trim()
      .replace(/^\.?\//, '')
    if (source) uniqueSources.add(source)
  })

  return Array.from(uniqueSources)
}

export {
  embedDocuments,
  getStatistics,
  initialize,
  getAllVideosWithScenes,
  getAllVideos,
  queryCollection,
  filterExistingVideos,
  updateDocuments,
  updateMetadata,
  getByVideoSource,
  getVideosMetadataSummary,
  getVideoWithScenesBySceneIds,
  getCollectionCount,
  getUniqueVideoSources,
}
