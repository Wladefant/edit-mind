import { getVideoAnalytics } from '@shared/utils/analytics'
import type { VideoSearchParams } from './search'
import type { ChatMessage } from '@prisma/client'
import { YearStats } from './stats'
import { YearInReviewData } from '@shared/schemas/yearInReview'
import { VideoWithScenes } from './video'

export interface AIModel {
  generateActionFromPrompt(
    query: string,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: VideoSearchParams; tokens: number; error?: string | undefined }>
  generateAssistantMessage(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateGeneralResponse(
    userPrompt: string,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  classifyIntent(
    prompt: string,
    chatHistory?: ChatMessage[]
  ): Promise<{
    data: { type?: 'compilation' | 'analytics' | 'general'; needsVideoData?: boolean }
    tokens: number
    error?: string | undefined
  }>
  generateAnalyticsResponse(
    userPrompt: string,
    analytics: Awaited<ReturnType<typeof getVideoAnalytics>>,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  generateCompilationResponse(
    userPrompt: string,
    resultsCount: number,
    chatHistory?: ChatMessage[]
  ): Promise<{ data: string; tokens: number; error?: string | undefined }>
  cleanUp?(): Promise<void>
  generateYearInReviewResponse(
    stats: YearStats,
    videos: VideoWithScenes[],
    extraDetails: string
  ): Promise<{ data: YearInReviewData | null; tokens: number; error?: string | undefined }>
}
