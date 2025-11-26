import { Llama, LlamaModel, LlamaContext } from 'node-llama-cpp'
import { SEARCH_AI_MODEL } from '../constants'
import {
  GENERAL_RESPONSE_PROMPT,
  ANALYTICS_RESPONSE_PROMPT,
  ASSISTANT_MESSAGE_PROMPT,
  SEARCH_PROMPT,
  CLASSIFY_INTENT_PROMPT,
  VIDEO_COMPILATION_MESSAGE_PROMPT,
} from '../constants/prompts'
import type { VideoSearchParams } from '../types/search'
import { VideoSearchParamsSchema } from '@shared/schemas/search'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { ChatMessage } from '@prisma/client'

class LocalLLM {
  private llama: Llama | null = null
  private model: LlamaModel | null = null
  private context: LlamaContext | null = null
  private initPromise: Promise<void> | null = null

  async init() {
    // Prevent multiple simultaneous initializations
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.context) {
      return // Already initialized
    }

    this.initPromise = this._doInit()
    await this.initPromise
    this.initPromise = null
  }

  private async _doInit() {
    if (!SEARCH_AI_MODEL) {
      throw new Error('Local model enabled, but SEARCH_AI_MODEL is not set.')
    }

    if (!this.llama) {
      const loader = await import('node-llama-cpp')
      this.llama = await loader.getLlama()
    }

    if (!this.model) {
      this.model = await this.llama!.loadModel({ modelPath: SEARCH_AI_MODEL })
    }

    if (!this.context) {
      this.context = await this.model!.createContext({
        contextSize: 4096,
        sequences: 10, // Support concurrent requests
      })
    }
  }

  async generate(prompt: string, max = 512): Promise<string> {
    await this.init()

    const { LlamaChatSession } = await import('node-llama-cpp')
    const seq = this.context!.getSequence()
    const session = new LlamaChatSession({ contextSequence: seq })

    try {
      const res = await session.prompt(prompt, {
        maxTokens: max,
        temperature: 0.1,
        topP: 0.9,
      })
      return res.trim()
    } finally {
      session.dispose()
      seq.dispose()
    }
  }

  parseResponse(raw: string, fallback: VideoSearchParams): VideoSearchParams {
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)

    if (!match) return fallback

    try {
      return VideoSearchParamsSchema.parse(JSON.parse(match[0]))
    } catch {
      return fallback
    }
  }

  async generateActionFromPrompt(query: string): Promise<VideoSearchParams> {
    const fallback: VideoSearchParams = {
      action: null,
      emotions: [],
      objects: [],
      duration: null,
      shot_type: null,
      aspect_ratio: '16:9',
      transcriptionQuery: null,
      description: query || 'No query provided',
    }

    if (!query || query.trim() === '') {
      return fallback
    }

    const raw = await this.generate(SEARCH_PROMPT(query), 1024)
    return this.parseResponse(raw, fallback)
  }

  async generateAssistantMessage(userPrompt: string, count: number): Promise<string> {
    return await this.generate(ASSISTANT_MESSAGE_PROMPT(userPrompt, count))
  }

  async generateCompilationResponse(userPrompt: string, count: number): Promise<string> {
    return await this.generate(VIDEO_COMPILATION_MESSAGE_PROMPT(userPrompt, count))
  }
  async generateGeneralResponse(prompt: string, history?: ChatMessage[]): Promise<string> {
    const context = history?.length ? history.map((h) => `${h.sender}: ${h.text}`).join('\n') : ''

    return await this.generate(GENERAL_RESPONSE_PROMPT(prompt, context))
  }

  async classifyIntent(prompt: string) {
    const raw = await this.generate(CLASSIFY_INTENT_PROMPT(prompt))
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return { type: 'compilation', needsVideoData: true }
    }
  }

  async generateAnalyticsResponse(prompt: string, analytics: Awaited<ReturnType<typeof getVideoAnalytics>>) {
    return await this.generate(ANALYTICS_RESPONSE_PROMPT(prompt, analytics))
  }

  async cleanup(): Promise<void> {
    await this.context?.dispose()
    await this.model?.dispose()
    this.context = null
    this.model = null
    this.llama = null
  }
}

export const LocalModel = new LocalLLM()
