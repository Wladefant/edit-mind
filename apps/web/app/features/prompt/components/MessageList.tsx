import { Message } from './Message'
import type { ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'

type MessageListProps = {
  messages: (ChatMessage & { outputScenes: Scene[] })[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
  stitchSelectedScenes: (messageId: string) => void
  isStitching: boolean
}

export function MessageList({ messages, selectedScenes, handleSelectScene, stitchSelectedScenes,isStitching }: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {messages.map((msg) => (
        <div key={msg.id} className="space-y-4">
          <Message
            {...msg}
            selectedScenes={selectedScenes}
            handleSelectScene={handleSelectScene}
            stitchSelectedScenes={stitchSelectedScenes}
            isStitching={isStitching}
          />
        </div>
      ))}
    </div>
  )
}
