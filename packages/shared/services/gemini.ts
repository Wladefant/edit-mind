import { GoogleGenerativeAI } from '@google/generative-ai'
import { GEMINI_API_KEY } from '../constants'
import {
  GENERAL_RESPONSE_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
  SEARCH_PROMPT,
} from '../constants/prompts'
import type { ChatMessage } from '@prisma/client'
import type { VideoSearchParams } from '../types/search'
import { logger } from './logger'
import { getVideoAnalytics } from '@shared/utils/analytics'

if (!GEMINI_API_KEY) {
  throw new Error('Gemini API key missing')
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

export const GeminiModel = {
  async generateActionFromPrompt(query: string): Promise<VideoSearchParams> {
    try {
      const result = await model.generateContent(SEARCH_PROMPT(query))
      const json = result.response
        .text()
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()

      return JSON.parse(json)
    } catch (err) {
      logger.error('Gemini generateActionFromPrompt failed: ' + err)
      return {
        action: query,
        emotions: [],
        objects: [],
        duration: 120,
        aspect_ratio: '16:9',
        shot_type: 'long-shot',
        description: query,
        transcriptionQuery: undefined,
      }
    }
  },

  async generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<string> {
    try {
      const res = await model.generateContent(ASSISTANT_MESSAGE_PROMPT(userPrompt, resultsCount))
      return res.response.text().trim()
    } catch (error) {
      logger.error('Gemini generateAssistantMessage error: ' + error)
      return `I found ${resultsCount} scenes. Ready to create your compilation!`
    }
  },

  async generateGeneralResponse(userPrompt: string, chatHistory?: ChatMessage[]): Promise<string> {
    const history = chatHistory?.length
      ? `Recent conversation:\n${chatHistory
          .slice(-5)
          .map((m) => `${m.sender}: ${m.text}`)
          .join('\n')}`
      : ''

    try {
      const res = await model.generateContent(GENERAL_RESPONSE_PROMPT(userPrompt, history))
      return res.response.text().trim()
    } catch (err) {
      logger.error('Gemini general response error:' + err)
      return `I'm your video assistant — what would you like to do?`
    }
  },

  async classifyIntent(prompt: string) {
    try {
      const result = await model.generateContent(CLASSIFY_INTENT_PROMPT(prompt))
      const text = result.response
        .text()
        .replace(/```json|```/g, '')
        .trim()
      return JSON.parse(text)
    } catch (error) {
      logger.error('Gemini classifyIntent error: ' + error)
      return { type: 'compilation', needsVideoData: true }
    }
  },
  async generateCompilationResponse(userPrompt: string, count: number): Promise<string> {
    try {
      const res = await model.generateContent(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count))
      return res.response.text().trim()
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      return `Here's your stitched video ready!`
    }
  },
  async generateAnalyticsResponse(
    userPrompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
  ): Promise<string> {
    try {
      const res = await model.generateContent(ANALYTICS_RESPONSE_PROMPT(userPrompt, analytics))
      return res.response.text().trim()
    } catch (error) {
      logger.error('Gemini analytics error: ' + error)
      return `I found ${analytics.uniqueVideos} videos (${analytics.totalScenes}).`
    }
  },
}
