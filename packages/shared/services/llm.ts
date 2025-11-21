import { VideoSearchParams } from '../types/search'
import { LlamaModel, LlamaContext } from 'node-llama-cpp'
import { z } from 'zod'
import { getVideoAnalytics } from '../utils/analytics'
import { CACHE_TTL, SEARCH_AI_MODEL } from '../constants'

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
  private llama: any = null
  private model: LlamaModel | null = null
  private context: LlamaContext | null = null
  private responseCache = new Map<string, { result: any; timestamp: number }>()

  async initialize() {
    if (this.model && this.context) return { model: this.model, context: this.context }

    if (!this.llama) {
      const { getLlama } = await import('node-llama-cpp')
      this.llama = await getLlama()
    }

    const modelPath = SEARCH_AI_MODEL

    this.model = await this.llama.loadModel({ modelPath })
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
    const SYSTEM_PROMPT = `Extract video search parameters from the user query into JSON format.

RULES:
1. Return ONLY valid JSON - no markdown, no explanations
2. All fields are required (use null or [] when not applicable)
3. Extract ALL mentioned emotions, objects, and parameters

SCHEMA:
{
  "action": string | null,
  "emotions": ["happy"|"sad"|"surprised"|"angry"|"neutral"|"excited"|"calm"],
  "shot_type": "close-up" | "medium-shot" | "long-shot" | null,
  "aspect_ratio": "16:9"|"9:16"|"1:1"|"4:3"|"8:7",
  "duration": number | null,
  "description": string,
  "outputFilename": string,
  "objects": string[],
  "transcriptionQuery": string | null
}

Query: ${query}

JSON OUTPUT:`

    const response = await this.generateCompletion(SYSTEM_PROMPT, 512)
    return this.parseAndValidate(response, query)
  }

  private parseAndValidate(response: string, query: string): VideoSearchParams {
    const cleaned = response.trim().replace(/```(?:json)?\s*/g, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return this.createFallback(query)
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])
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
    return (
      filename
        ?.toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || `video-${Date.now()}`
    )
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

  getCachedResult(cacheKey: string): any | null {
    const cached = this.responseCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
    if (cached) this.responseCache.delete(cacheKey)
    return null
  }

  setCachedResult(cacheKey: string, result: any): void {
    this.responseCache.set(cacheKey, { result, timestamp: Date.now() })
  }

  async cleanup() {
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
    const cached = modelManager.getCachedResult(cacheKey)
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
  const cached = modelManager.getCachedResult(cacheKey)
  if (cached) return cached

  const prompt = `You are a helpful video compilation assistant. The user requested: "${userPrompt}"

You found ${resultsCount} video scenes matching their request.

Respond with a brief, friendly message (1-2 sentences) acknowledging their request and what you found. Be conversational and helpful.

Examples:
- "I found 15 clips matching your description! Ready to compile them into your video."
- "Great! I've located 8 happy moments from your summer videos."
- "Found 12 scenes where you're riding a bike outdoors. Let me know if you'd like to proceed!"

Your response:`

  try {
    const result = await modelManager.generateCompletion(prompt, 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error generating assistant message:', error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateCompilationResponse(userPrompt: string, resultsCount: number): Promise<string> {
  return generateAssistantMessage(userPrompt, resultsCount)
}

export async function generateGeneralResponse(userPrompt: string, chatHistory?: any[]): Promise<string> {
  const cacheKey = `general:${userPrompt}`
  const cached = modelManager.getCachedResult(cacheKey)
  if (cached) return cached

  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\n\nRecent conversation:\n${chatHistory
          .slice(-5)
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : ''

  const prompt = `You are a friendly, helpful AI assistant for a video library application. You help users:
1. Search and compile their videos
2. Get analytics and insights about their video collection
3. Have casual conversations

The user said: "${userPrompt}"${historyContext}

Respond naturally and helpfully (1-3 sentences). If they're asking what you can do, mention you can:
- Create video compilations based on descriptions, people, emotions, etc.
- Answer questions about their video library (duration, counts, statistics)
- Search for specific moments or phrases in videos

Your response:`

  try {
    const result = await modelManager.generateCompletion(prompt, 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error generating general response:', error)
    return "I'm your video library assistant! I can help you create compilations, analyze your videos, or just chat. What would you like to do?"
  }
}

export async function classifyIntent(prompt: string): Promise<{
  type: 'compilation' | 'analytics' | 'general'
  needsVideoData: boolean
}> {
  const cacheKey = `intent:${prompt?.toLowerCase().trim()}`
  const cached = modelManager.getCachedResult(cacheKey)
  if (cached) return cached

  const classificationPrompt = `Classify this user query about their video library:

Query: "${prompt}"

Determine:
1. Type: 
   - "compilation" = user wants to create/find/compile videos
   - "analytics" = user wants statistics/information about their videos
   - "general" = casual conversation or unclear requests

2. needsVideoData: true if you need to query the video database to answer, false otherwise

Respond with ONLY valid JSON:
{"type": "compilation" | "analytics" | "general", "needsVideoData": true | false}

Examples:
"Create a 30 second video of me looking happy" -> {"type":"compilation","needsVideoData":true}
"How many videos do I have?" -> {"type":"analytics","needsVideoData":true}
"Hello, how are you?" -> {"type":"general","needsVideoData":false}

Your JSON response:`

  try {
    const response = await modelManager.generateCompletion(classificationPrompt, 128)
    const text = response
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      modelManager.setCachedResult(cacheKey, result)
      return result
    }
  } catch (error) {
    console.error('Error classifying intent:', error)
  }

  return { type: 'compilation', needsVideoData: true }
}

export async function generateAnalyticsResponse(
  userPrompt: string,
  analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
): Promise<string> {
  const cacheKey = `analytics:${userPrompt}:${analytics.uniqueVideos}:${analytics.totalScenes}`
  const cached = modelManager.getCachedResult(cacheKey)
  if (cached) return cached

  const analyticsPrompt = `You are a friendly, knowledgeable video library assistant. The user asked: "${userPrompt}"

Here's what you found in their video library:
- Total videos: ${analytics.uniqueVideos}
- Total scenes: ${analytics.totalScenes}
- Total duration: ${analytics.totalDurationFormatted} (${analytics.totalDuration} seconds)
${analytics.dateRange ? `- Date range: ${analytics.dateRange.oldest.toLocaleDateString()} to ${analytics.dateRange.newest.toLocaleDateString()}` : ''}
${
  Object.keys(analytics.emotionCounts).length > 0
    ? `- Emotions detected: ${Object.entries(analytics.emotionCounts)
        .map(([e, c]) => `${e} (${c})`)
        .join(', ')}`
    : ''
}
${
  Object.keys(analytics.faceOccurrences).length > 0
    ? `- People appearing: ${Object.entries(analytics.faceOccurrences)
        .map(([f, c]) => `@${f} appears in ${c} scenes`)
        .join(', ')}`
    : ''
}

Respond naturally and conversationally (2-4 sentences). Include specific numbers and insights. Be enthusiastic and helpful.

Your response:`

  try {
    const result = await modelManager.generateCompletion(analyticsPrompt, 256)
    modelManager.setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    console.error('Error generating analytics response:', error)
    return `I found ${analytics.uniqueVideos} videos (${analytics.totalScenes} scenes) with a total duration of ${analytics.totalDurationFormatted}.`
  }
}

export const generateActionFromPromptInternal = (query: string) => modelManager.generateParams(query)
export const cleanup = () => modelManager.cleanup()
