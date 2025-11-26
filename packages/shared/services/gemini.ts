import { ChatMessage } from './../../../node_modules/.pnpm/@prisma+client@6.19.0_prisma@6.19.0_typescript@5.9.2__typescript@5.9.2/node_modules/.prisma/client/index.d'
import { GoogleGenerativeAI } from '@google/generative-ai'
import 'dotenv/config'
import { VideoSearchParams } from '../types/search'
import { CACHE_TTL, GEMINI_API_KEY } from '../constants'
import { getVideoAnalytics } from '../utils/analytics'
import { logger } from './logger'
import {
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  GENERAL_RESPONSE_PROMPT,
  GENERATE_ACTION_PROMPT,
} from '../constants/prompts'

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

const responseCache = new Map<string, { result: VideoSearchParams; timestamp: number }>()

export async function generateActionFromPrompt(query: string, useCache = true): Promise<VideoSearchParams> {
  const cacheKey = query.toLowerCase().trim()

  if (useCache && responseCache.has(cacheKey)) {
    const cached = responseCache.get(cacheKey)!
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.result
    }
    responseCache.delete(cacheKey)
  }

  const result = await generateActionFromPromptInternal(query)

  if (useCache) {
    responseCache.set(cacheKey, { result, timestamp: Date.now() })
  }

  return result
}

export async function generateActionFromPromptInternal(query: string): Promise<VideoSearchParams> {
  try {
    const result = await model.generateContent(GENERATE_ACTION_PROMPT(query))
    const response = result.response

    const text = response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(text)

    if (!parsed.outputFilename) {
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      parsed.outputFilename = `video-${timestamp}`
    }

    return parsed
  } catch (error) {
    logger.error('Error generating search query: ' + error)
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return {
      action: query,
      emotions: [],
      outputFilename: `video-${timestamp}`,
      objects: [],
      duration: 120,
      aspect_ratio: '16:9',
      shot_type: 'long-shot',
      description: query,
      transcriptionQuery: undefined,
    }
  }
}
export async function generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<string> {
  try {
    const result = await model.generateContent(ASSISTANT_MESSAGE_PROMPT(userPrompt, resultsCount))
    return result.response.text().trim()
  } catch (error) {
    logger.error('Error generating assistant message: ' + error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateCompilationResponse(userPrompt: string, resultsCount: number): Promise<string> {
  try {
    const result = await model.generateContent(ASSISTANT_MESSAGE_PROMPT(userPrompt, resultsCount))
    return result.response.text().trim()
  } catch (error) {
    logger.error('Error generating compilation message: ' + error)
    return `I found ${resultsCount} scenes matching your request. Ready to create your compilation!`
  }
}

export async function generateGeneralResponse(userPrompt: string, chatHistory?: ChatMessage[]): Promise<string> {
  const historyContext =
    chatHistory && chatHistory.length > 0
      ? `\n\nRecent conversation:\n${chatHistory
          .slice(-5)
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : ''

  try {
    const result = await model.generateContent(GENERAL_RESPONSE_PROMPT(userPrompt, historyContext))
    return result.response.text().trim()
  } catch (error) {
    logger.error('Error generating general response: ' + error)
    return "I'm your video library assistant! I can help you create compilations, analyze your videos, or just chat. What would you like to do?"
  }
}

export async function classifyIntent(prompt: string): Promise<{
  type: 'compilation' | 'analytics' | 'general'
  needsVideoData: boolean
}> {
  try {
    const result = await model.generateContent(CLASSIFY_INTENT_PROMPT(prompt))
    const text = result.response
      .text()
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim()
    return JSON.parse(text)
  } catch (error) {
    logger.error('Error classifying intent: ' + error)
    return { type: 'compilation', needsVideoData: true }
  }
}

export async function generateAnalyticsResponse(
  userPrompt: string,
  analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
): Promise<string> {
  try {
    const result = await model.generateContent(ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics))
    return result.response.text().trim()
  } catch (error) {
    logger.error('Error generating analytics response: ' + error)
    return `I found ${analytics.uniqueVideos} videos (${analytics.totalScenes} scenes) with a total duration of ${analytics.totalDurationFormatted}.`
  }
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = []
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

  for (const text of texts) {
    const result = await model.embedContent(text)
    embeddings.push(result.embedding.values)
  }

  return embeddings
}
