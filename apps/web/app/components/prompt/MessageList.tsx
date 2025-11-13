import type { VideoWithScenes } from '@shared/types/video'
import { Message } from './Message'
import { VideoResults } from './VideoResults'
import type { Sender } from '@prisma/client'

type MessageListProps = {
  messages: { id: number; sender: Sender; text: string; outputScenes: VideoWithScenes[] }[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {messages.map((msg) => (
        <>
          <Message key={msg.id} {...msg} />
          {msg.outputScenes && <VideoResults videos={msg.outputScenes} />}
        </>
      ))}
    </div>
  )
}
