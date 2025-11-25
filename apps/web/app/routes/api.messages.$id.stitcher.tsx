import type { ActionFunction } from 'react-router'
import { prisma } from '~/services/database'

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
    const backgroundJobsUrl = process.env.BACKGROUND_JOBS_URL || 'http://localhost:4000'

    await fetch(`${backgroundJobsUrl}/stitcher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedSceneIds,
        messageId,
        chatId: message.chatId,
      }),
    })

    const messageAssistant = await prisma.chatMessage.create({
      data: {
        chatId: message.chatId,
        sender: 'assistant',
        text: 'I’m creating your video, I’ll let you know when it’s ready!',
      },
    })

    return messageAssistant
  } catch (error) {
    console.error(error)
    return { error: 'Error queuing your video for stitching' }
  }
}
