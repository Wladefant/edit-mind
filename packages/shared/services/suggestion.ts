import { createClient } from 'redis'
import type { RedisClientType } from 'redis'
import { ShotType } from '../types'
import { SearchQuery } from '../types/search'
import { getAllDocs } from './vectorDb'
import { logger } from './logger'

export interface Suggestion {
  text: string
  type: 'face' | 'object' | 'emotion' | 'camera' | 'shot_type' | 'location' | 'transcription' | 'text'
  count: number
}

export interface GroupedSuggestions {
  [key: string]: Suggestion[]
}

class SearchSuggestionCache {
  private redisClient: RedisClientType | null = null
  private isInitialized = false
  private readonly CACHE_PREFIX = 'search:suggestions:cache:'
  private readonly STATS_KEY = 'search:suggestions:stats'
  private readonly MIN_PREFIX_LENGTH = 2
  private readonly MAX_PREFIX_LENGTH = 10
  private readonly MEMORY_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_MEMORY_CACHE_SIZE = 1000
  private readonly REDIS_KEY_TTL = 7 * 24 * 60 * 60 // 7 days

  private memoryCache: Map<string, { suggestions: Suggestion[]; timestamp: number }> = new Map()

  private readonly STOP_WORDS = new Set([
    'the',
    'is',
    'at',
    'which',
    'on',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'with',
    'to',
    'for',
    'of',
    'as',
    'by',
    'this',
    'that',
    'it',
    'from',
    'be',
    'are',
    'was',
    'were',
    'been',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
  ])

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    if (!this.redisClient) {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      })

      this.redisClient.on('error', (err) => logger.error('Redis Client Error:', err))
      await this.redisClient.connect()
    }

    const stats = await this.getStats()
    if (!stats.isInitialized || stats.totalPrefixes === 0) {
      logger.debug('Building search suggestion cache...')
      await this.buildCache()
    } else {
      logger.debug('Search suggestion cache already initialized')
    }

    this.isInitialized = true
  }

  private async buildCache(): Promise<void> {
    const allDocs = await getAllDocs()

    const faceCounts = new Map<string, number>()
    const objectCounts = new Map<string, number>()
    const emotionCounts = new Map<string, number>()
    const cameraCounts = new Map<string, number>()
    const shotTypeCounts = new Map<string, number>()
    const locationCounts = new Map<string, number>()
    const transcriptionTerms = new Map<string, number>()
    const textTerms = new Map<string, number>()

    allDocs.metadatas?.forEach((metadata) => {
      if (!metadata) return

      this.extractArray(metadata.faces, faceCounts)
      this.extractArray(metadata.objects, objectCounts)
      this.extractArray(metadata.emotions, emotionCounts)

      if (metadata.camera) {
        const camera = metadata.camera.toString().toLowerCase()
        cameraCounts.set(camera, (cameraCounts.get(camera) || 0) + 1)
      }

      if (metadata.shot_type) {
        const shotType = metadata.shot_type.toString().toLowerCase()
        shotTypeCounts.set(shotType, (shotTypeCounts.get(shotType) || 0) + 1)
      }

      if (metadata.environment) {
        const location = metadata.environment.toString().toLowerCase()
        locationCounts.set(location, (locationCounts.get(location) || 0) + 1)
      }

      if (metadata.transcription) {
        this.extractWords(metadata.transcription.toString(), transcriptionTerms, 3)
      }

      if (metadata.detectedText) {
        this.extractWords(metadata.detectedText.toString(), textTerms, 3)
      }
    })

    await this.indexTerms(faceCounts, 'face')
    await this.indexTerms(objectCounts, 'object')
    await this.indexTerms(emotionCounts, 'emotion')
    await this.indexTerms(cameraCounts, 'camera')
    await this.indexTerms(shotTypeCounts, 'shot_type')
    await this.indexTerms(locationCounts, 'location')
    await this.indexTerms(transcriptionTerms, 'transcription')
    await this.indexTerms(textTerms, 'text')

    await this.redisClient?.set(
      this.STATS_KEY,
      JSON.stringify({
        isInitialized: true,
        lastBuilt: new Date().toISOString(),
        totalTerms:
          faceCounts.size +
          objectCounts.size +
          emotionCounts.size +
          cameraCounts.size +
          shotTypeCounts.size +
          locationCounts.size +
          transcriptionTerms.size +
          textTerms.size,
      })
    )

    logger.debug('Search suggestion cache built successfully')
  }

  private extractArray(value: any, counts: Map<string, number>): void {
    if (!value) return
    const items = Array.isArray(value) ? value : [value]
    items.forEach((item) => {
      const normalized = item.toString().toLowerCase().trim()
      if (normalized && normalized.includes('person') && !normalized.includes('unknown') && normalized.length >= 2) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      }
    })
  }

  private extractWords(text: string, counts: Map<string, number>, minLength = 3): void {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= minLength)

    words.forEach((word) => {
      const cleaned = word.replace(/[^\w]/g, '')
      if (cleaned.length >= minLength && !this.STOP_WORDS.has(cleaned)) {
        counts.set(cleaned, (counts.get(cleaned) || 0) + 1)
      }
    })
  }

  private async indexTerms(counts: Map<string, number>, type: Suggestion['type']): Promise<void> {
    if (!this.redisClient || counts.size === 0) return

    const total = Array.from(counts.values()).reduce((a, b) => a + b, 0)

    const pipeline = this.redisClient.multi()
    const keysToExpire = new Set<string>()

    counts.forEach((count, term) => {
      const normalized = term.toLowerCase()
      const maxLen = Math.min(normalized.length, this.MAX_PREFIX_LENGTH)

      const frequency = count / total
      const lengthBonus = Math.min(normalized.length / 20, 1)
      const score = count * (1 + frequency * 10 + lengthBonus)

      for (let i = this.MIN_PREFIX_LENGTH; i <= maxLen; i++) {
        const prefix = normalized.slice(0, i)
        const key = `${this.CACHE_PREFIX}${prefix}`
        keysToExpire.add(key)

        const suggestion: Suggestion = { text: term, type, count }
        pipeline.zAdd(key, { score, value: JSON.stringify(suggestion) })
      }
    })

    // Set TTL on all created keys
    keysToExpire.forEach((key) => {
      pipeline.expire(key, this.REDIS_KEY_TTL)
    })

    await pipeline.exec()
  }

  async getSuggestions(query: string, limit = 8): Promise<Suggestion[]> {
    if (!this.isInitialized || query.length < this.MIN_PREFIX_LENGTH || !this.redisClient) {
      return []
    }

    const normalized = query.toLowerCase().trim()

    const cached = this.memoryCache.get(normalized)
    if (cached && Date.now() - cached.timestamp < this.MEMORY_CACHE_TTL) {
      return cached.suggestions.slice(0, limit)
    }

    const key = `${this.CACHE_PREFIX}${normalized}`

    let results = await this.redisClient.zRange(key, 0, limit * 2 - 1, {
      REV: true, // Highest scores first
    })

    if (results.length < limit && normalized.length >= 3) {
      const fuzzyKeys = [
        normalized.slice(0, -1), // Remove last character (typo)
        normalized.slice(1), // Remove first character (typo)
      ]

      for (const fuzzyKey of fuzzyKeys) {
        if (fuzzyKey.length >= this.MIN_PREFIX_LENGTH) {
          const fuzzyResults = await this.redisClient.zRange(`${this.CACHE_PREFIX}${fuzzyKey}`, 0, limit, { REV: true })
          results = [...results, ...fuzzyResults]
          if (results.length >= limit * 2) break
        }
      }
    }

    const seen = new Set<string>()
    const suggestions: Suggestion[] = []

    for (const item of results) {
      try {
        const suggestion = JSON.parse(item) as Suggestion
        if (!seen.has(suggestion.text)) {
          seen.add(suggestion.text)
          suggestions.push(suggestion)
          if (suggestions.length >= limit) break
        }
      } catch (err) {
        logger.error('Error parsing suggestion: ' + err)
      }
    }

    this.updateMemoryCache(normalized, suggestions)

    return suggestions
  }

  private updateMemoryCache(query: string, suggestions: Suggestion[]): void {
    // Evict oldest entry if cache is full (FIFO)
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value
      if (oldestKey) {
        this.memoryCache.delete(oldestKey)
      }
    }

    this.memoryCache.set(query, {
      suggestions,
      timestamp: Date.now(),
    })
  }

  async getGroupedSuggestions(query: string, limitPerGroup = 3, totalLimit = 20): Promise<GroupedSuggestions> {
    const suggestions = await this.getSuggestions(query, totalLimit)

    const grouped: GroupedSuggestions = {
      face: [],
      object: [],
      emotion: [],
      camera: [],
      shot_type: [],
      location: [],
      transcription: [],
      text: [],
    }

    suggestions.forEach((suggestion) => {
      if (grouped[suggestion.type]) {
        grouped[suggestion.type].push(suggestion)
      }
    })

    // Remove empty groups and limit per group
    Object.keys(grouped).forEach((key) => {
      if (grouped[key].length === 0) {
        delete grouped[key]
      } else {
        grouped[key] = grouped[key].slice(0, limitPerGroup)
      }
    })

    return grouped
  }

  async getSuggestionsByType(query: string, type: Suggestion['type'], limit = 5): Promise<Suggestion[]> {
    // Fetch more to ensure we have enough after filtering
    const allSuggestions = await this.getSuggestions(query, limit * 5)
    return allSuggestions.filter((s) => s.type === type).slice(0, limit)
  }

  async refresh(): Promise<void> {
    if (!this.redisClient) return

    logger.debug('Refreshing search suggestion cache...')

    // Clear Redis cache
    const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}*`)
    if (keys.length > 0) {
      await this.redisClient.del(keys)
    }
    await this.redisClient.del(this.STATS_KEY)

    // Clear memory cache
    this.memoryCache.clear()

    // Rebuild
    this.isInitialized = false
    await this.initialize()
  }

  async clear(): Promise<void> {
    if (!this.redisClient) return

    const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}*`)
    if (keys.length > 0) {
      await this.redisClient.del(keys)
    }
    await this.redisClient.del(this.STATS_KEY)

    this.memoryCache.clear()
    this.isInitialized = false
  }

  async getStats(): Promise<{
    totalPrefixes: number
    totalSuggestions: number
    isInitialized: boolean
    lastBuilt?: string
    totalTerms?: number
    memoryCacheSize: number
    memoryCacheHitRate?: number
  }> {
    if (!this.redisClient) {
      return {
        totalPrefixes: 0,
        totalSuggestions: 0,
        isInitialized: false,
        memoryCacheSize: 0,
      }
    }

    const statsData = await this.redisClient.get(this.STATS_KEY)
    const stats = statsData ? JSON.parse(statsData.toString()) : { isInitialized: false }

    const keys = await this.redisClient.keys(`${this.CACHE_PREFIX}*`)
    let totalSuggestions = 0

    const sampleSize = Math.min(keys.length, 100)
    const sampledKeys = keys.slice(0, sampleSize)

    for (const key of sampledKeys) {
      const count = await this.redisClient.zCard(key)
      totalSuggestions += count
    }

    // Extrapolate if we sampled
    if (keys.length > sampleSize) {
      totalSuggestions = Math.round((totalSuggestions / sampleSize) * keys.length)
    }

    return {
      totalPrefixes: keys.length,
      totalSuggestions,
      isInitialized: stats.isInitialized || false,
      lastBuilt: stats.lastBuilt,
      totalTerms: stats.totalTerms,
      memoryCacheSize: this.memoryCache.size,
    }
  }

  clearMemoryCache(): void {
    this.memoryCache.clear()
  }

  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit()
      this.redisClient = null
    }
    this.memoryCache.clear()
    this.isInitialized = false
  }
}

// Singleton instance
const suggestionCache = new SearchSuggestionCache()

export async function initializeSuggestionCache(): Promise<void> {
  await suggestionCache.initialize()
}

export async function getSearchSuggestions(query: string, limit?: number): Promise<Suggestion[]> {
  return suggestionCache.getSuggestions(query, limit)
}

export async function getGroupedSearchSuggestions(
  query: string,
  limitPerGroup?: number,
  totalLimit?: number
): Promise<GroupedSuggestions> {
  return suggestionCache.getGroupedSuggestions(query, limitPerGroup, totalLimit)
}

export async function getSuggestionsByType(
  query: string,
  type: Suggestion['type'],
  limit?: number
): Promise<Suggestion[]> {
  return suggestionCache.getSuggestionsByType(query, type, limit)
}

export async function refreshSuggestionCache(): Promise<void> {
  await suggestionCache.refresh()
}

export async function getSuggestionCacheStats() {
  return suggestionCache.getStats()
}

export async function clearMemoryCache(): Promise<void> {
  suggestionCache.clearMemoryCache()
}

export async function disconnectSuggestionCache(): Promise<void> {
  await suggestionCache.disconnect()
}

export function buildSearchQueryFromSuggestions(suggestions: Record<string, string>): SearchQuery {
  const searchQuery: SearchQuery = {}

  const typeMapping: Record<string, keyof SearchQuery> = {
    face: 'faces',
    emotion: 'emotions',
    shot_type: 'shot_type',
    object: 'objects',
    camera: 'camera',
    transcription: 'transcriptionQuery',
    text: 'detectedText',
    location: 'locations',
  }

  for (const [type, value] of Object.entries(suggestions)) {
    const field = typeMapping[type]

    if (!field || !value) continue

    switch (field) {
      case 'faces':
      case 'emotions':
      case 'objects':
      case 'locations':
        searchQuery[field] = value
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v)
        break

      case 'shot_type':
        searchQuery[field] = value as ShotType
        break

      case 'camera':
      case 'transcriptionQuery':
      case 'detectedText':
        searchQuery[field] = value
        break
    }
  }

  return searchQuery
}

export { suggestionCache }
