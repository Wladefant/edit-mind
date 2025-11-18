import { ChromaClient, Collection, Metadata, Where, WhereDocument } from 'chromadb'
import { EmbeddingInput, CollectionStatistics, Filters } from '../types/vector'
import { Video, VideoWithScenes } from '../types/video'
import { Scene } from '../types/scene'
import { SearchQuery, VideoMetadataSummary } from '../types/search'
import { metadataToScene, sceneToVectorFormat } from '../utils/embed'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME } from '../constants'
import { getEmbeddings } from '../services/gemini'

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
    const embeddings = await getEmbeddings(documentTexts)

    await collection.add({
      ids,
      metadatas,
      documents: documentTexts,
      embeddings,
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
  offset = 0,
  searchFilters?: Partial<Filters>
): Promise<{ videos: VideoWithScenes[]; allSources: string[]; filters: Filters }> => {
  try {
    await initialize()
    if (!collection) throw new Error('Collection not initialized')

    const allSources = await getUniqueVideoSources()
    const paginatedSources = allSources.slice(offset, offset + limit)
    let whereClause: Where | WhereDocument = {}

    if (searchFilters) {
      const conditions: Where[] = []

      if (searchFilters.faces?.length)
        conditions.push({ faces: { $in: searchFilters.faces.map((f) => f.toLowerCase()) } })
      if (searchFilters.objects?.length)
        conditions.push({ objects: { $in: searchFilters.objects.map((o) => o.toLowerCase()) } })
      if (searchFilters.emotions?.length)
        conditions.push({ emotions: { $in: searchFilters.emotions.map((e) => e.toLowerCase()) } })
      if (searchFilters.cameras?.length) conditions.push({ camera: { $in: searchFilters.cameras } })
      if (searchFilters.colors?.length) conditions.push({ dominantColorName: { $in: searchFilters.colors } })
      if (searchFilters.locations?.length) conditions.push({ environment: { $in: searchFilters.locations } })
      if (searchFilters.shotTypes?.length) conditions.push({ shot_type: { $in: searchFilters.shotTypes } })

      if (conditions.length === 1) {
        whereClause = conditions[0]
      } else if (conditions.length > 1) {
        whereClause = { $and: conditions }
      }
    }
    const allDocs = await collection.get({
      where:
        Object.keys(whereClause).length > 0
          ? { $and: [{ source: { $in: paginatedSources } }, whereClause] }
          : { source: { $in: paginatedSources } },
      include: ['metadatas'],
    })

    const videosDict: Record<string, VideoWithScenes> = {}

    const cameras = new Set<string>()
    const colors = new Set<string>()
    const locations = new Set<string>()
    const faces = new Set<string>()
    const objects = new Set<string>()
    const shotTypes = new Set<string>()
    const emotions = new Set<string>()

    for (let i = 0; i < allDocs.metadatas.length; i++) {
      const metadata = allDocs.metadatas[i]
      if (!metadata) continue

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

      if (scene.camera) cameras.add(scene.camera.toString())
      if (scene.dominantColorName) colors.add(scene.dominantColorName.toString())
      if (scene.location) locations.add(scene.location.toString())
      if (scene.faces) scene.faces.forEach((f: string) => faces.add(f))
      if (scene.objects) scene.objects.forEach((o: string) => objects.add(o))
      if (scene.emotions) scene.emotions.forEach((o) => objects.add(o.emotion))
      if (scene.shot_type) shotTypes.add(scene.shot_type.toString())
    }

    const videosList = Object.values(videosDict).map((video) => {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      return video
    })

    // Deduplicate & sort by creation date
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

    const filters = {
      cameras: Array.from(cameras),
      colors: Array.from(colors),
      locations: Array.from(locations),
      faces: Array.from(faces),
      objects: Array.from(objects),
      shotTypes: Array.from(shotTypes),
      emotions: Array.from(emotions),
    }

    return { videos: uniqueVideos, allSources, filters }
  } catch {
    return {
      videos: [],
      allSources: [],
      filters: { cameras: [], colors: [], locations: [], faces: [], objects: [], shotTypes: [], emotions: [] },
    }
  }
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
    if (query.locations && query.locations.length > 0) {
      conditions.push({
        environment: { $in: query.locations },
      })
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
          $eq: videoSource,
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
      if (scene.dominantColorName) {
        const name = scene.dominantColorName.toLowerCase()
        colorsCount[name] = (shotTypesCount[name] || 0) + 1
      }

      // Emotions
      scene.emotions?.forEach((e) => {
        const name = e.emotion.toLowerCase()
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
async function getVideoWithScenesBySceneIds(sceneIds: string[]): Promise<Scene[]> {
  try {
    await initialize()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    if (sceneIds.length === 0) {
      return []
    }

    const result = await collection.get({
      ids: sceneIds,
      include: ['metadatas'],
    })

    const scenes = []

    if (result && result.metadatas) {
      for (let i = 0; i < result.metadatas.length; i++) {
        const metadata = result.metadatas[i]
        if (!metadata) continue

        const scene: Scene = metadataToScene(metadata, result.ids[i])
        scenes.push(scene)
      }
    }

    return scenes
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
    const source = metadata?.source.toString()
    if (source) uniqueSources.add(source)
  })

  return Array.from(uniqueSources)
}
async function updateScenesSource(oldSource: string, newSource: string): Promise<void> {
  await initialize()
  if (!collection) throw new Error('Collection not initialized')

  const result = await collection.get({
    where: { source: { $eq: oldSource } },
    include: ['metadatas'],
  })

  if (!result.ids || result.ids.length === 0) {
    console.warn(`No scenes found for source: ${oldSource}`)
    return
  }

  const ids = result.ids
  const metadatas = result.metadatas.map((metadata) => ({
    ...metadata,
    source: newSource,
  }))

  await collection.update({
    ids,
    metadatas,
  })
}

const hybridSearch = async (query: SearchQuery, nResults = 100): Promise<VideoWithScenes[]> => {
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

    if (query.locations && query.locations.length > 0) {
      conditions.push({
        environment: { $in: query.locations },
      })
    }
    let whereClause: Where | WhereDocument = {}

    if (conditions.length === 1) {
      whereClause = conditions[0]
    } else if (conditions.length > 1) {
      whereClause = { $and: conditions }
    }
    let finalScenes: { metadatas: Metadata[]; ids: string[] } | undefined[] = []

    if (query.semanticQuery) {
      console.debug('Performing hybrid search...')

      const queryEmbeddings = await getEmbeddings([query.semanticQuery])

      const vectorQuery = await collection.query({
        queryEmbeddings: queryEmbeddings,
        nResults: nResults,
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: ['metadatas'],
      })

      finalScenes = { metadatas: vectorQuery.metadatas[0], ids: vectorQuery.ids[0] }
    } else {
      console.debug('Performing metadata-only search...')
      const result = await collection.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        limit: nResults,
        include: ['metadatas'],
      })
      finalScenes = { metadatas: result.metadatas, ids: result.ids }
    }

    if (finalScenes[0] === undefined) {
      return []
    }
    const videosDict: Record<string, VideoWithScenes> = {}

    if (finalScenes && finalScenes.metadatas && finalScenes.ids) {
      for (let i = 0; i < finalScenes.metadatas.length; i++) {
        const metadata = finalScenes.metadatas[i]
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

        const scene: Scene = metadataToScene(metadata, finalScenes.ids[i])
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
export {
  embedDocuments,
  getStatistics,
  initialize,
  getAllVideosWithScenes,
  getAllVideos,
  hybridSearch,
  filterExistingVideos,
  updateDocuments,
  updateMetadata,
  getByVideoSource,
  getVideosMetadataSummary,
  getVideoWithScenesBySceneIds,
  getCollectionCount,
  getUniqueVideoSources,
  updateScenesSource,
  queryCollection,
}
