import type { ActionFunctionArgs } from 'react-router'
import {
  classifyIntent,
  generateActionFromPrompt,
  generateAnalyticsResponse,
  generateCompilationResponse,
  generateGeneralResponse,
} from '@shared/services/gemini'
import { hybridSearch } from '@shared/services/vectorDb';
import { prisma } from '~/services/database'
import { getVideoAnalytics } from '@shared/utils/analytics'
import { getUser } from '~/services/user.sever'
import type { ChatMessage } from '@prisma/client'
import { nanoid } from 'nanoid'

export const action = async ({ request }: ActionFunctionArgs) => {
  const { prompt } = await request.json()
  if (!prompt) throw new Response('Invalid request', { status: 400 })

  const user = await getUser(request)
  if (!user) throw new Response('Unauthorized', { status: 401 })

  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: prompt.substring(0, 50),
      id: nanoid(4),
    },
  })

  await prisma.chatMessage.create({
    data: {
      chatId: chat.id,
      sender: 'user',
      text: prompt,
      id: nanoid(4),
    },
  })

  const recentMessages: ChatMessage[] = []

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
      const faces = prompt?.match(/@(\w+)/g)?.map((name: string) => name.substring(1)) || []
      const { shot_type, emotions, description, aspect_ratio, objects, camera, transcriptionQuery } =
        await generateActionFromPrompt(prompt)

      const results = await hybridSearch({
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
      assistantText = await generateCompilationResponse(prompt, outputSceneIds.length)
      break
    }

    case 'general':
    default: {
      assistantText = await generateGeneralResponse(prompt, recentMessages)
      break
    }
  }

  await prisma.chatMessage.create({
    data: {
      chatId: chat.id,
      sender: 'assistant',
      text: assistantText,
      outputSceneIds,
    },
  })

  return new Response(JSON.stringify({ chatId: chat.id }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
