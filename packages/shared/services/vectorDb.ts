import { ChromaClient, Collection, Metadata, Where, WhereDocument } from 'chromadb'
import { EmbeddingInput, CollectionStatistics, Filters } from '../types/vector'
import { Video, VideoWithScenes } from '../types/video'
import { Scene } from '../types/scene'
import { VideoSearchParams, VideoMetadataSummary } from '../types/search'
import { metadataToScene, sanitizeMetadata, sceneToVectorFormat } from '../utils/embed'
import { CHROMA_HOST, CHROMA_PORT, COLLECTION_NAME, IS_TESTING } from '../constants'
import { getEmbeddings } from '../services/embedding'
import { suggestionCache } from './suggestion'
import { getCache, setCache } from './cache'
import { logger } from './logger'
import { getLocationName } from '@shared/utils/location'
import { YearStats } from '@shared/types/stats'

export const createVectorDbClient = async (
  collectionName: string = COLLECTION_NAME
): Promise<{
  collection: Collection | null
  client: ChromaClient | null
}> => {
  let client: ChromaClient | null = null
  let collection: Collection | null = null

  if (client && collection)
    return {
      client,
      collection,
    }

  client = new ChromaClient({ host: CHROMA_HOST, port: parseInt(CHROMA_PORT) })
  collection = await client.getOrCreateCollection({ name: collectionName })

  return {
    client,
    collection,
  }
}

async function embedDocuments(documents: EmbeddingInput[]): Promise<void> {
  try {
    const validDocuments = documents.filter((d) => d.text && d.text.trim().length > 0 && d.id && d.metadata)

    if (validDocuments.length === 0) {
      logger.warn('No valid documents to embed after validation')
      return
    }

    const { collection } = await createVectorDbClient()
    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const sanitizedDocuments = validDocuments.map((doc) => ({
      ...doc,
      metadata: doc.metadata ? sanitizeMetadata(doc.metadata) : {},
    }))

    const ids = sanitizedDocuments.map((d) => d.id)
    const metadatas = sanitizedDocuments.map((d) => d.metadata || {})
    const documentTexts = sanitizedDocuments.map((d) => d.text)

    const embeddings = await getEmbeddings(documentTexts)

    if (!embeddings || embeddings.length !== documentTexts.length) {
      throw new Error('Embedding count mismatch')
    }

    const dimensions = new Set(embeddings.map((e) => e.length))
    if (dimensions.size > 1) {
      throw new Error(`Inconsistent embedding dimensions: ${Array.from(dimensions).join(', ')}`)
    }

    await collection.add({
      ids,
      metadatas,
      documents: documentTexts,
      embeddings,
    })

    if (!IS_TESTING) {
      await suggestionCache.refresh()
    }
  } catch (error) {
    logger.error('Error embedding documents:' + error)
    throw error
  }
}

async function getStatistics(): Promise<CollectionStatistics> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const count = await collection.count()

    const results = await collection?.get({
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
    logger.error('Error getting statistics: ' + error)
    throw error
  }
}
async function getAllDocs(): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection?.get({
      include: ['metadatas'],
    })

    return allDocs.metadatas.map((metadata, index) => metadataToScene(metadata, allDocs.ids[index]))
  } catch (error) {
    logger.error('Error getting docs: ' + error)
    throw error
  }
}

const getAllVideos = async (): Promise<Video[]> => {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const allDocs = await collection?.get({
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
            createdAt: parseInt(metadata.createdAt?.toString() || '0'),
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
            faces: [],
            emotions: [],
            objects: [],
            shotTypes: [],
          }
        }
      }
    }

    return Object.values(uniqueVideos)
  } catch (error) {
    logger.error('Error getting all videos:' + error)
    throw error
  }
}
const getAllVideosWithScenes = async (
  limit = 20,
  offset = 0,
  searchFilters?: Partial<Filters>
): Promise<{ videos: VideoWithScenes[]; allSources: string[]; filters: Filters }> => {
  try {
    const cacheKey = `videos:paginated:${offset}:${limit}:${JSON.stringify(searchFilters || {})}`

    const cached = await getCache<{ videos: VideoWithScenes[]; allSources: string[]; filters: Filters }>(cacheKey)
    if (cached) {
      logger.debug('Cache hit for videos:' + cacheKey)
      return cached
    }

    const { collection } = await createVectorDbClient()

    if (!collection) throw new Error('Collection not initialized')

    const allSources = await getUniqueVideoSources()
    const paginatedSources = allSources.slice(offset, offset + limit)

    if (searchFilters) {
      const { where: whereClause } = applyFilters(searchFilters)

      const allDocs = await collection?.get({
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

        const source = metadata.source?.toString()
        if (!source) continue

        if (!videosDict[source]) {
          videosDict[source] = {
            source,
            duration: parseFloat(metadata.duration?.toString() || '0.00'),
            aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
            camera: metadata.camera?.toString() || 'N/A',
            category: metadata.category?.toString() || 'Uncategorized',
            createdAt: parseInt(metadata.createdAt?.toString() || '0'),
            scenes: [],
            sceneCount: 0,
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
            faces: [],
            emotions: [],
            objects: [],
            shotTypes: [],
          }
        }

        const scene: Scene = metadataToScene(metadata, allDocs.ids[i])

        // Collect per-video faces, emotions, objects, shot types
        if (scene.faces)
          scene.faces.forEach((f) => {
            if (!videosDict[source].faces?.includes(f)) videosDict[source].faces.push(f)
          })
        if (scene.emotions)
          scene.emotions.forEach((e) => {
            if (!videosDict[source].emotions?.includes(e.emotion)) videosDict[source].emotions.push(e.emotion)
          })
        if (scene.objects)
          scene.objects.forEach((o) => {
            if (!videosDict[source].objects?.includes(o)) videosDict[source].objects.push(o)
          })
        if (scene.shot_type && !videosDict[source].shotTypes?.includes(scene.shot_type))
          videosDict[source].shotTypes.push(scene.shot_type)

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
      const result = {
        videos: uniqueVideos,
        allSources,
        filters,
      }
      if (!IS_TESTING) {
        await setCache(cacheKey, result, 300)
      }

      return result
    }
    const emptyResult = {
      videos: [],
      allSources: [],
      filters: { cameras: [], colors: [], locations: [], faces: [], objects: [], shotTypes: [], emotions: [] },
    }

    if (!IS_TESTING) {
      await setCache(cacheKey, emptyResult, 300)
    }

    return emptyResult
  } catch {
    return {
      videos: [],
      allSources: [],
      filters: { cameras: [], colors: [], locations: [], faces: [], objects: [], shotTypes: [], emotions: [] },
    }
  }
}

const queryCollection = async (query: VideoSearchParams, nResults = 500): Promise<VideoWithScenes[]> => {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) throw new Error('Collection not initialized')

    const { where: whereClause } = applyFilters(query)

    const result = await collection?.get({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: ['metadatas', 'documents', 'embeddings'],
      limit: nResults,
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
            createdAt: parseInt(metadata.createdAt?.toString() || '0'),
            scenes: [],
            sceneCount: 0,
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
            faces: [],
            emotions: [],
            objects: [],
            shotTypes: [],
          }
        }

        const scene: Scene = metadataToScene(metadata, result.ids[i])
        videosDict[source].scenes.push(scene)
        // Collect per-video faces, emotions, objects, shot types
        if (scene.faces)
          scene.faces.forEach((f) => {
            if (!videosDict[source].faces?.includes(f)) videosDict[source].faces.push(f)
          })
        if (scene.emotions)
          scene.emotions.forEach((e) => {
            if (!videosDict[source].emotions?.includes(e.emotion)) videosDict[source].emotions.push(e.emotion)
          })
        if (scene.objects)
          scene.objects.forEach((o) => {
            if (!videosDict[source].objects?.includes(o)) videosDict[source].objects.push(o)
          })
        if (scene.shot_type && !videosDict[source].shotTypes?.includes(scene.shot_type))
          videosDict[source].shotTypes.push(scene.shot_type)
      }
    }

    const videosList: VideoWithScenes[] = []
    for (const video of Object.values(videosDict)) {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      videosList.push(video)
    }

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()

      return timeB - timeA
    })
    return videosList
  } catch (error) {
    logger.error('Error querying collection: ' + error)
    throw error
  }
}

async function filterExistingVideos(videoSources: string[]): Promise<string[]> {
  if (videoSources.length === 0) {
    return []
  }
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const results = await collection?.get({
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
    logger.error('Error filtering existing videos: ' + error)
    return videoSources
  }
}

async function getByVideoSource(videoSource: string): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const result = await collection?.get({
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
    logger.error('Error filtering existing videos: ' + error)
    return []
  }
}

async function updateMetadata(scene: Scene): Promise<void> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const existing = await collection?.get({
      ids: [scene.id],
      include: ['metadatas', 'documents', 'embeddings'],
    })

    if (!existing.ids || existing.ids.length === 0) {
      logger.warn(`Document ${scene.id} not found, skipping`)
      return
    }

    const vector = await sceneToVectorFormat(scene)

    const embeddings = await getEmbeddings([vector.text])

    await collection.update({
      ids: [scene.id],
      metadatas: [vector.metadata],
      documents: [vector.text],
      embeddings: embeddings,
    })

    if (!IS_TESTING) {
      // Refresh suggestions cache after update exciting videos
      await suggestionCache.refresh()
    }
  } catch (error) {
    logger.error('Error updating documents: ' + error)
    throw error
  }
}

async function getVideosMetadataSummary(): Promise<VideoMetadataSummary> {
  try {
    const cacheKey = `videos:metadata`

    if (!IS_TESTING) {
      const cached = await getCache<VideoMetadataSummary>(cacheKey)
      if (cached) {
        logger.debug('Cache hit for metadata:' + cacheKey)
        return cached
      }
    }
    const { collection } = await createVectorDbClient()

    if (!collection) throw new Error('Collection not initialized')

    const allDocs = await collection?.get({
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
        if (!name.includes('unknown')) {
          facesCount[name] = (facesCount[name] || 0) + 1
        }
      })

      // Colors
      if (scene.dominantColorName) {
        const name = scene.dominantColorName.toLowerCase()
        if (!name.includes('n/a')) {
          colorsCount[name] = (colorsCount[name] || 0) + 1
        }
      }

      // Emotions
      if (!Array.isArray(scene.emotions)) {
        logger.debug(scene.emotions)
      }
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
        if (!name.includes('person')) {
          objectsCount[name] = (objectsCount[name] || 0) + 1
        }
      })
    })

    const getTop = (obj: Record<string, number>) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => ({ name, count: 1 }))

    const result = {
      topFaces: getTop(facesCount),
      topColors: getTop(colorsCount),
      topEmotions: getTop(emotionsCount),
      shotTypes: getTop(shotTypesCount),
      topObjects: getTop(objectsCount),
      cameras: getTop(cameraCount),
    }

    if (!IS_TESTING) {
      await setCache(cacheKey, result, 300)
    }
    return result
  } catch (error) {
    logger.error('Error aggregating metadata from DB: ' + error)
    throw error
  }
}
async function getVideoWithScenesBySceneIds(sceneIds: string[]): Promise<Scene[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    if (sceneIds.length === 0) {
      return []
    }

    const result = await collection?.get({
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
    logger.error('Error getting videos with scenes by scene IDs: ' + error)
    throw error
  }
}

async function getCollectionCount(): Promise<number> {
  const { collection } = await createVectorDbClient()

  return await collection!.count()
}

async function getUniqueVideoSources(): Promise<string[]> {
  const { collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  const allDocs = await collection?.get({ include: ['metadatas'] })

  const uniqueSources = new Set<string>()
  allDocs.metadatas
    ?.sort((a, b) => {
      if (a && a.createdAt && b && b.createdAt) {
        const timeA = isNaN(Date.parse(a.createdAt.toString())) ? 0 : new Date(a.createdAt.toString()).getTime()
        const timeB = isNaN(Date.parse(b.createdAt.toString())) ? 0 : new Date(b.createdAt.toString()).getTime()

        return timeB - timeA
      }
      return -1
    })
    .forEach((metadata) => {
      const source = metadata?.source?.toString()
      if (source) uniqueSources.add(source)
    })

  return Array.from(uniqueSources)
}
async function updateScenesSource(oldSource: string, newSource: string): Promise<void> {
  const { collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  const result = await collection?.get({
    where: { source: { $eq: oldSource } },
    include: ['metadatas'],
  })

  if (!result.ids || result.ids.length === 0) {
    logger.warn(`No scenes found for source: ${oldSource}`)
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
async function deleteByVideoSource(source: string): Promise<void> {
  const { collection } = await createVectorDbClient()

  if (!collection) throw new Error('Collection not initialized')

  await collection.delete({ where: { source: source } })
}

const hybridSearch = async (query: VideoSearchParams, nResults = undefined): Promise<VideoWithScenes[]> => {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    const { where: whereClause, whereDocument } = applyFilters(query)

    let finalScenes: { metadatas: (Metadata | null)[]; ids: string[] } | null = null

    if (query.semanticQuery) {
      logger.debug('Performing hybrid search...')

      const queryEmbeddings = await getEmbeddings([query.semanticQuery])

      const vectorQuery = await collection.query({
        queryEmbeddings: queryEmbeddings,
        nResults: nResults,
        include: ['metadatas'],
      })

      if (vectorQuery.metadatas.length > 0) {
        finalScenes = { metadatas: vectorQuery.metadatas[0], ids: vectorQuery.ids[0] }
      }
    } else {
      logger.debug('Performing metadata-only search...')
      const result = await collection?.get({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        whereDocument: whereDocument,
        include: ['metadatas'],
        limit: nResults,
      })
      finalScenes = { metadatas: result.metadatas, ids: result.ids }
    }

    if (!finalScenes || finalScenes.ids.length === 0) {
      return []
    }

    const videosDict: Record<string, VideoWithScenes> = {}

    if (finalScenes.metadatas && finalScenes.ids) {
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
            createdAt: parseInt(metadata.createdAt?.toString() || '0'),
            scenes: [],
            sceneCount: 0,
            thumbnailUrl: metadata.thumbnailUrl?.toString(),
            faces: [],
            emotions: [],
            objects: [],
            shotTypes: [],
          }
        }

        const scene: Scene = metadataToScene(metadata, finalScenes.ids[i])
        videosDict[source].scenes.push(scene)

        // Collect per-video faces, emotions, objects, shot types
        if (scene.faces)
          scene.faces.forEach((f) => {
            if (!videosDict[source].faces?.includes(f)) videosDict[source].faces.push(f)
          })
        if (scene.emotions)
          scene.emotions.forEach((e) => {
            if (!videosDict[source].emotions?.includes(e.emotion)) videosDict[source].emotions.push(e.emotion)
          })
        if (scene.objects)
          scene.objects.forEach((o) => {
            if (!videosDict[source].objects?.includes(o)) videosDict[source].objects.push(o)
          })
        if (scene.shot_type && !videosDict[source].shotTypes?.includes(scene.shot_type))
          videosDict[source].shotTypes.push(scene.shot_type)
      }
    }

    const videosList: VideoWithScenes[] = []
    for (const video of Object.values(videosDict)) {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      videosList.push(video)
    }

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()

      return timeB - timeA
    })

    return videosList
  } catch (error) {
    logger.error('Error querying collection: ' + error)
    throw error
  }
}

function applyFilters(query: VideoSearchParams): {
  where: Where | WhereDocument
  whereDocument: WhereDocument | undefined
} {
  const conditions: Where[] = []
  let whereDocument: WhereDocument | undefined = undefined

  if (query.aspect_ratio) {
    conditions.push({
      aspect_ratio: { $in: Array.isArray(query.aspect_ratio) ? query.aspect_ratio : [query.aspect_ratio] },
    })
  }

  if (query.camera) {
    conditions.push({
      camera: { $in: Array.isArray(query.camera) ? query.camera : [query.camera] },
    })
  }

  if (query.shot_type) {
    conditions.push({ shot_type: query.shot_type })
  }

  if (query.faces?.length) {
    query.faces.forEach((face) => conditions.push({ faces: face }))
  }

  if (query.objects?.length) {
    query.objects.forEach((object) => conditions.push({ objects: object }))
  }

  if (query.emotions?.length) {
    query.emotions.forEach((emotion) => conditions.push({ emotions: emotion }))
  }

  // Handle transcription as document search
  if (query.transcriptionQuery) {
    whereDocument = { $contains: query.transcriptionQuery }
  }

  if (query.detectedText) {
    // If you also want to search detected text in documents
    if (whereDocument) {
      // Combine with existing document filter using $and
      whereDocument = {
        $and: [whereDocument, { $contains: query.detectedText }],
      }
    } else {
      whereDocument = { $contains: query.detectedText }
    }
  }

  if (query.locations?.length) {
    query.locations.forEach((location) => conditions.push({ environment: location }))
  }

  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? { $and: conditions } : {}

  return { where, whereDocument }
}
async function getVideosNotEmbedded(videoSources: string[]): Promise<string[]> {
  try {
    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }
    if (videoSources.length === 0) {
      return []
    }

    const results = await collection?.get({
      where: {
        source: {
          $in: videoSources,
        },
      },
      include: ['metadatas'],
    })

    const embeddedCount: Record<string, number> = {}
    results.metadatas.forEach((metadata) => {
      if (metadata && metadata.source) {
        const source = metadata.source.toString()
        embeddedCount[source] = (embeddedCount[source] || 0) + 1
      }
    })

    const embedded = Object.keys(embeddedCount)
    const notEmbedded = videoSources.filter((source) => !embedded.includes(source))

    return notEmbedded
  } catch (error) {
    logger.error('Error checking embedded videos: ' + error)
    throw error
  }
}
async function getScenesByYear(year: number): Promise<{
  videos: VideoWithScenes[]
  stats: YearStats
}> {
  try {
    const cacheKey = `videos:yearly:${year}`

    const { collection } = await createVectorDbClient()

    if (!collection) {
      throw new Error('Collection not initialized')
    }

    if (!IS_TESTING) {
      const cached = await getCache<{ videos: VideoWithScenes[]; stats: YearStats }>(cacheKey)
      if (cached) {
        logger.debug('Cache hit for metadata:' + cacheKey)
        return cached
      }
    }

    const start = new Date(`${year}-01-01T00:00:00.000Z`).getTime()
    const end = new Date(`${year}-12-31T23:59:59.999Z`).getTime()

    const allDocs = await collection.get({
      include: ['metadatas'],
      where: {
        $and: [{ createdAt: { $gte: start } }, { createdAt: { $lte: end } }],
      },
    })

    const videosDict: Record<string, VideoWithScenes> = {}
    const globalStats = {
      totalEmotions: new Map<string, number>(),
      totalObjects: new Map<string, number>(),
      totalFaces: new Map<string, number>(),
      totalShotTypes: new Map<string, number>(),
      totalCategories: new Map<string, number>(),
      longestScene: { duration: 0, description: '', videoSource: '' },
      shortestScene: { duration: Infinity, description: '', videoSource: '' },
      totalDuration: 0,
    }

    if (allDocs && allDocs.metadatas && allDocs.ids) {
      for (let i = 0; i < allDocs.metadatas.length; i++) {
        const metadata = allDocs.metadatas[i]
        if (!metadata) continue

        const createdAt = metadata.createdAt
        if (!createdAt) continue

        const scene: Scene = metadataToScene(metadata, allDocs.ids[i])
        const sceneDuration = scene.endTime - scene.startTime

        if (sceneDuration > globalStats.longestScene.duration) {
          globalStats.longestScene = {
            duration: sceneDuration,
            description: scene.description || '',
            videoSource: metadata.source?.toString() || '',
          }
        }

        if (sceneDuration < globalStats.shortestScene.duration && sceneDuration > 0) {
          globalStats.shortestScene = {
            duration: sceneDuration,
            description: scene.description || '',
            videoSource: metadata.source?.toString() || '',
          }
        }

        globalStats.totalDuration += sceneDuration

        scene.emotions?.forEach((e) => {
          const emotion = e.emotion
          if (emotion.toLocaleLowerCase().includes('n/a')) return
          globalStats.totalEmotions.set(emotion, (globalStats.totalEmotions.get(emotion) || 0) + 1)
        })

        scene.objects?.forEach((obj) => {
          if (obj.toLocaleLowerCase().includes('person')) return
          globalStats.totalObjects.set(obj, (globalStats.totalObjects.get(obj) || 0) + 1)
        })

        scene.faces?.forEach((face) => {
          if (face.toLocaleLowerCase().includes('unknown')) return
          globalStats.totalFaces.set(face, (globalStats.totalFaces.get(face) || 0) + 1)
        })

        if (scene.shot_type) {
          globalStats.totalShotTypes.set(scene.shot_type, (globalStats.totalShotTypes.get(scene.shot_type) || 0) + 1)
        }

        if (metadata.category) {
          const category = metadata.category.toString()
          globalStats.totalCategories.set(category, (globalStats.totalCategories.get(category) || 0) + 1)
        }

        const source = metadata.source?.toString()
        if (source) {
          if (!videosDict[source]) {
            let locationName
            if (metadata.location?.toString()) {
              locationName = await getLocationName(metadata.location?.toString())
            }

            videosDict[source] = {
              source,
              duration: parseFloat(metadata.duration?.toString() || '0.00'),
              aspect_ratio: metadata.aspect_ratio?.toString() || 'N/A',
              camera: metadata.camera?.toString() || 'N/A',
              category: metadata.category?.toString() || 'Uncategorized',
              createdAt: parseInt(metadata.createdAt?.toString() || '0'),
              scenes: [],
              sceneCount: 0,
              thumbnailUrl: metadata.thumbnailUrl?.toString(),
              faces: [],
              emotions: [],
              objects: [],
              shotTypes: [],
              locationName,
            }
          }

          videosDict[source].scenes.push(scene)

          if (scene.faces)
            scene.faces.forEach((f) => {
              if (!videosDict[source].faces?.includes(f) && !f.toLocaleLowerCase().includes("unknown")) videosDict[source].faces.push(f)
            })
          if (scene.emotions)
            scene.emotions.forEach((e) => {
              if (!videosDict[source].emotions?.includes(e.emotion)  && !e.emotion.toLocaleLowerCase().includes("n/a")) videosDict[source].emotions.push(e.emotion)
            })
          if (scene.objects)
            scene.objects.forEach((o) => {
              if (!videosDict[source].objects?.includes(o)  && !o.toLocaleLowerCase().includes("person")) videosDict[source].objects.push(o)
            })
          if (scene.shot_type && !videosDict[source].shotTypes?.includes(scene.shot_type))
            videosDict[source].shotTypes.push(scene.shot_type)
        }
      }
    }

    const videosList = Object.values(videosDict).map((video) => {
      video.scenes.sort((a, b) => a.startTime - b.startTime)
      video.sceneCount = video.scenes.length
      return video
    })

    videosList.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime()
      const timeB = new Date(b.createdAt).getTime()
      return timeA - timeB
    })

    const stats: YearStats = {
      totalVideos: videosList.length,
      totalScenes: allDocs.ids?.length || 0,
      totalDuration: globalStats.totalDuration,
      topEmotions: Array.from(globalStats.totalEmotions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([emotion, count]) => ({ emotion, count })),
      topObjects: Array.from(globalStats.totalObjects.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count })),
      topFaces: Array.from(globalStats.totalFaces.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topShotTypes: Array.from(globalStats.totalShotTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      categories: Array.from(globalStats.totalCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      longestScene: globalStats.longestScene,
      shortestScene: globalStats.shortestScene.duration !== Infinity ? globalStats.shortestScene : null,
    }

    const result = {
      videos: videosList,
      stats,
    }

    if (!IS_TESTING) {
      await setCache(cacheKey, result, 300)
    }

    return result
  } catch (error) {
    logger.error('Error getting scenes by year: ' + error)
    throw error
  }
}

export {
  embedDocuments,
  getStatistics,
  getAllVideosWithScenes,
  getAllVideos,
  hybridSearch,
  filterExistingVideos,
  updateMetadata,
  getByVideoSource,
  getVideosMetadataSummary,
  getVideoWithScenesBySceneIds,
  getCollectionCount,
  getUniqueVideoSources,
  updateScenesSource,
  queryCollection,
  getAllDocs,
  getVideosNotEmbedded,
  getScenesByYear,
  deleteByVideoSource,
}
