import { LocalModel } from './llm'
import { GeminiModel } from './gemini'
import { logger } from './logger'
import path from 'path'
import { GEMINI_API_KEY, GEMINI_MODEL_NAME, SEARCH_AI_MODEL, USE_LOCAL } from '@shared/constants'
import { AIModel } from '@shared/types/ai'

let activeModel: AIModel

if (USE_LOCAL && SEARCH_AI_MODEL) {
  logger.debug(`Using Local Model: ${path.basename(SEARCH_AI_MODEL)}`)
  activeModel = LocalModel
} else if (GEMINI_API_KEY) {
  logger.debug(`Using Gemini Model: ${GEMINI_MODEL_NAME}`)
  activeModel = GeminiModel
} else {
  throw new Error('No valid AI backend found. Set USE_LOCAL + SEARCH_AI_MODEL or GEMINI_API_KEY.')
}

async function runWithLogging<T>(fn: () => Promise<T>, query: string): Promise<T> {
  try {
    const result = await fn()
    return result
  } catch (err) {
    logger.error(`Error processing query "${query}": ${err}`)
    throw err
  }
}

export const generateActionFromPrompt = async (query: string) =>
  runWithLogging(() => activeModel.generateActionFromPrompt(query), query)

export const generateAssistantMessage = async (userPrompt: string, resultsCount: number) =>
  runWithLogging(() => activeModel.generateAssistantMessage(userPrompt, resultsCount), userPrompt)

export const generateCompilationResponse = async (userPrompt: string, resultsCount: number) =>
  runWithLogging(() => activeModel.generateCompilationResponse(userPrompt, resultsCount), userPrompt)

export const generateGeneralResponse = async (userPrompt: string, chatHistory?: any[]) =>
  runWithLogging(() => activeModel.generateGeneralResponse(userPrompt, chatHistory), userPrompt)

export const classifyIntent = async (prompt: string) => runWithLogging(() => activeModel.classifyIntent(prompt), prompt)

export const generateAnalyticsResponse = async (userPrompt: string, analytics: any) =>
  runWithLogging(() => activeModel.generateAnalyticsResponse(userPrompt, analytics), userPrompt)

export const cleanup = async () => {
  if (activeModel.cleanUp) {
    await activeModel.cleanUp()
  }
}
