import {
  classifyIntent,
  generateActionFromPrompt,
  generateAnalyticsResponse,
  generateCompilationResponse,
  generateGeneralResponse,
} from '@shared/services/gemini'
import { getVideoWithScenesBySceneIds, hybridSearch } from '@shared/services/vectorDb';
import type { ActionFunction, LoaderFunction } from 'react-router'
import { prisma } from '~/services/database'
import { getVideoAnalytics } from '@shared/utils/analytics'

export const loader: LoaderFunction = async ({ params }) => {
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  const messages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  })

  const messagesWithScenes = await Promise.all(
    messages.map(async (message) => {
      if (!message.outputSceneIds || message.outputSceneIds.length === 0) {
        return {
          ...message,
          outputScenes: null,
        }
      }

      const outputScenes = await getVideoWithScenesBySceneIds(message.outputSceneIds)

      return {
        ...message,
        outputScenes,
      }
    })
  )

  return messagesWithScenes
}
export const action: ActionFunction = async ({ request, params }) => {
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  const { prompt } = await request.json()
  if (!prompt) throw new Response('Invalid request', { status: 400 })

  await prisma.chatMessage.create({
    data: {
      chatId,
      sender: 'user',
      text: prompt,
    },
  })

  const recentMessages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const intent = await classifyIntent(prompt)

  let assistantText: string
  let outputSceneIds: string[] = []

  switch (intent.type) {
    case 'analytics': {
      // User wants statistics/information
      const analytics = await getVideoAnalytics(prompt)
      assistantText = await generateAnalyticsResponse(prompt, analytics)
      outputSceneIds = analytics.sceneIds
      break
    }

    case 'compilation': {
      // User wants to create a video compilation
      const {
        shot_type,
        emotions,
        description,
        aspect_ratio,
        objects,
        camera,
        transcriptionQuery,
        faces,
        semanticQuery,
      } = await generateActionFromPrompt(prompt)

      const results = await hybridSearch({
        semanticQuery,
        faces,
        shot_type,
        emotions,
        description,
        aspect_ratio,
        objects,
        camera,
        transcriptionQuery,
      })

      outputSceneIds = results.flatMap((result) => result.scenes.map((scene) => scene.id))
      assistantText = await generateCompilationResponse(prompt, results.length)
      break
    }

    case 'general':
    default: {
      // General conversation
      assistantText = await generateGeneralResponse(prompt, recentMessages)
      break
    }
  }

  const messageAssistant = await prisma.chatMessage.create({
    data: {
      chatId,
      sender: 'assistant',
      text: assistantText,
      outputSceneIds,
    },
  })

  return {
    ...messageAssistant,
    outputScenes: await getVideoWithScenesBySceneIds(outputSceneIds),
  }
}
