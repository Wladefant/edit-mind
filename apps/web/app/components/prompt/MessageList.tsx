import { Message } from './Message';

type MessageListProps = {
  messages: { id: number; sender: 'user' | 'assistant'; text: string }[];
};

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {messages.map((msg) => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
}
