import type { ChatMessage } from '@prisma/client'
import { VideoSearchParams } from '../types/search'
import { LlamaModel, LlamaContext, Llama } from 'node-llama-cpp'
import { z } from 'zod'
import { getVideoAnalytics } from '../utils/analytics'
import { CACHE_TTL, SEARCH_AI_MODEL } from '../constants'
import { logger } from './logger'
import type { CachedResponse } from '../types/cache'
import { IntentClassification } from '../types/llm'
import {
  ASSISTANT_MESSAGE_PROMPT,
  GENERAL_RESPONSE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  SEARCH_PROMPT,
} from '../constants/prompts';

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable(),
  emotions: z.array(z.string()).default([]),
  shot_type: z.enum(['medium-shot', 'long-shot', 'close-up']).nullable(),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3', '8:7']).nullable().default('16:9'),
  duration: z.number().positive().nullable(),
  description: z.string().min(1),
  outputFilename: z.string().min(1),
  objects: z.array(z.string()).default([]),
  transcriptionQuery: z.string().nullable(),
})

class LlamaModelManager {
  private llama: Llama | null = null
  private model: LlamaModel | null = null
  private context: LlamaContext | null = null
  private responseCache = new Map<string, CachedResponse<unknown>>()

  async initialize(): Promise<{ model: LlamaModel; context: LlamaContext }> {
    if (this.model && this.context) return { model: this.model, context: this.context }

    if (!this.llama) {
      const { getLlama } = await import('node-llama-cpp')
      this.llama = await getLlama()
    }

    if (!SEARCH_AI_MODEL) throw new Error('SEARCH_AI_MODEL is not set')

    this.model = await this.llama.loadModel({ modelPath: SEARCH_AI_MODEL })
    if (!this.model) throw new Error('Failed to load model')

    this.context = await this.model.createContext({
      sequences: 4,
      contextSize: 4096,
    })

    return { model: this.model, context: this.context }
  }

  async generateCompletion(prompt: string, maxTokens = 512): Promise<string> {
    const { context } = await this.initialize()
    const { LlamaChatSession } = await import('node-llama-cpp')
    const sequence = context.getSequence()
    const session = new LlamaChatSession({ contextSequence: sequence })

    try {
      const response = await session.prompt(prompt, {
        maxTokens,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      })
      return response.trim()
    } finally {
      session.dispose()
      sequence.dispose()
    }
  }

  async generateParams(query: string): Promise<VideoSearchParams> {
    const response = await this.generateCompletion(SEARCH_PROMPT(query), 512)
    return this.parseAndValidate(response, query)
  }

  private parseAndValidate(response: string, query: string): VideoSearchParams {
    const cleaned = response.trim().replace(/```(?:json)?\s*/g, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return this.createFallback(query)
    }

    try {
      const parsed: unknown = JSON.parse(jsonMatch[0])
      const validated = VideoSearchParamsSchema.parse(parsed)

      return {
        ...validated,
        outputFilename: this.sanitizeFilename(validated.outputFilename),
      }
    } catch {
      return this.createFallback(query)
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      ?.toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || `video-${Date.now()}`;
  }

  private createFallback(query: string): VideoSearchParams {
    return {
      action: null,
      emotions: [],
      shot_type: null,
      aspect_ratio: '16:9',
      duration: null,
      description: query || 'video search',
      outputFilename: this.sanitizeFilename(query) || `video-${Date.now()}`,
      objects: [],
      transcriptionQuery: null,
    }
  }

  getCachedResult<T>(cacheKey: string): T | null {
    const cached = this.responseCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result as T
    }
    if (cached) this.responseCache.delete(cacheKey)
    return null
  }

  setCachedResult<T>(cacheKey: string, result: T): void {
    this.responseCache.set(cacheKey, { result, timestamp: Date.now() })
  }

  async cleanup(): Promise<void> {
    await this.context?.dispose()
    await this.model?.dispose()
    this.context = null
    this.model = null
    this.llama = null
  }
}

const modelManager = new LlamaModelManager()

export async function generateActionFromPrompt(query: string, useCache = true): Promise<VideoSearchParams> {
  const cacheKey = `params:${query?.toLowerCase().trim()}`

  if (useCache) {
    const cached = modelManager.getCachedResult<VideoSearchParams>(cacheKey)
    if (cached) return cached
  }

  const result = await modelManager.generateParams(query)

  if (useCache) {
    modelManager.setCachedResult(cacheKey, result)
  }

  return result
}

export async function generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<string> {
  const cacheKey = `assistant:${userPrompt}:${resultsCount}`
  const cached = modelManager.getCachedResult<string>(cacheKey)
  if (cached) return cached

  try {
    const result = await modelManager.generateCompletion(ASSISTANT_MESSAGE_PROMPT(userPrompt, resultsCount), 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    logger.error('Error generating assistant message: ' + error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateCompilationResponse(userPrompt: string, resultsCount: number): Promise<string> {
  return generateAssistantMessage(userPrompt, resultsCount)
}

export async function generateGeneralResponse(userPrompt: string, chatHistory?: ChatMessage[]): Promise<string> {
  const cacheKey = `general:${userPrompt}`
  const cached = modelManager.getCachedResult<string>(cacheKey)
  if (cached) return cached

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\n\nRecent conversation:\n${chatHistory
          .slice(-5)
          .map((m: ChatMessage) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : ''

  try {
    const result = await modelManager.generateCompletion(GENERAL_RESPONSE_PROMPT(userPrompt, historyContext), 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    logger.error('Error generating general response: ' + error)
    return "I'm your video library assistant! I can help you create compilations, analyze your videos, or just chat. What would you like to do?"
  }
}

export async function classifyIntent(prompt: string): Promise<IntentClassification> {
  const cacheKey = `intent:${prompt?.toLowerCase().trim()}`
  const cached = modelManager.getCachedResult<IntentClassification>(cacheKey)
  if (cached) return cached

  try {
    const response = await modelManager.generateCompletion(CLASSIFY_INTENT_PROMPT(prompt), 128)
    const text = response
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const result: unknown = JSON.parse(jsonMatch[0])
      // Type validation
      if (
        typeof result === 'object' &&
        result !== null &&
        'type' in result &&
        'needsVideoData' in result &&
        (result.type === 'compilation' || result.type === 'analytics' || result.type === 'general') &&
        typeof result.needsVideoData === 'boolean'
      ) {
        const validResult = result as IntentClassification
        modelManager.setCachedResult(cacheKey, validResult)
        return validResult
      }
    }
  } catch (error) {
    logger.error('Error classifying intent: ' + error)
  }

  return { type: 'compilation', needsVideoData: true }
}

export async function generateAnalyticsResponse(
  userPrompt: string,
  analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
): Promise<string> {
  const cacheKey = `analytics:${userPrompt}:${analytics.uniqueVideos}:${analytics.totalScenes}`
  const cached = modelManager.getCachedResult<string>(cacheKey)
  if (cached) return cached

  try {
    const result = await modelManager.generateCompletion(ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics), 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    logger.error('Error generating analytics response: ' + error)
    return `I found ${analytics.uniqueVideos} videos (${analytics.totalScenes} scenes) with a total duration of ${analytics.totalDurationFormatted}.`
  }
}

export const generateActionFromPromptInternal = (query: string): Promise<VideoSearchParams> =>
  modelManager.generateParams(query)
export const cleanup = (): Promise<void> => modelManager.cleanup()
