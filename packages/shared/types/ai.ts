import { getVideoAnalytics } from '@shared/utils/analytics'
import type { VideoSearchParams } from './search'
import type { ChatMessage } from '@prisma/client'

export interface AIModel {
  generateActionFromPrompt(query: string): Promise<VideoSearchParams>
  generateAssistantMessage(userPrompt: string, resultsCount: number): Promise<string>
  generateGeneralResponse(userPrompt: string, chatHistory?: ChatMessage[]): Promise<string>
  classifyIntent(prompt: string): Promise<{ type: 'compilation' | 'analytics' | 'general'; needsVideoData: boolean }>
  generateAnalyticsResponse(
    userPrompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>
  ): Promise<string>
  generateCompilationResponse(userPrompt: string, resultsCount: number): Promise<string>
  cleanUp?(): Promise<void>
}
