import type { ActionFunction } from 'react-router'
import { prisma } from '~/services/database'
import { stitchVideos } from '@shared/utils/sticher'
import { getVideoWithScenesBySceneIds } from '@shared/services/vectorDb'

export const action: ActionFunction = async ({ request, params }) => {
  const messageId = params.id
  if (!messageId) {
    return new Response('Chat Message ID required', { status: 400 })
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
  })

  if (!message) {
    return new Response('Chat Message not found', { status: 404 })
  }

  let selectedSceneIds: string[]
  try {
    const body = await request.json()
    selectedSceneIds = body.selectedSceneIds
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  if (!Array.isArray(selectedSceneIds) || selectedSceneIds.length === 0) {
    return new Response('selectedSceneIds must be a non-empty array', { status: 400 })
  }
  try {
    const outputScenes = await getVideoWithScenesBySceneIds(selectedSceneIds)
    if (!outputScenes || outputScenes.length === 0) {
      return new Response('No scenes found for the provided IDs', { status: 404 })
    }

    const stitchedVideoPath = await stitchVideos(outputScenes, `${messageId}.mp4`)

    const messageAssistant = await prisma.chatMessage.create({
      data: {
        chatId: message.chatId,
        sender: 'assistant',
        text: 'Here’s your stitched video!',
        stitchedVideoPath,
      },
    })

    return messageAssistant
  } catch (error) {
    console.error(error)
    return { error: 'Error creating your stitched video' }
  }
}
