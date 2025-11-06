import { AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '~/components/dashboard/DashboardLayout';
import { useChat } from '../hooks/useChat';
import { Welcome } from '../components/prompt/Welcome';
import { MessageList } from '../components/prompt/MessageList';
import { LoadingIndicator } from '../components/prompt/LoadingIndicator';
import { VideoResults } from '../components/prompt/VideoResults';
import { ChatInput } from '../components/prompt/ChatInput';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = () => {
  return [{ title: 'Prompt | Edit Mind' }]
}
export async function loader() {}

export default function ChatPage() {
  const {
    messages,
    input,
    videoResults,
    isLoading,
    messagesEndRef,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
  } = useChat();

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <Welcome onSuggestionClick={handleSuggestionClick} />
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 pb-8">
                <MessageList messages={messages} />
                {isLoading && <LoadingIndicator />}
                {videoResults && <VideoResults videos={videoResults} />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </AnimatePresence>
        </main>

        <ChatInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </div>
    </DashboardLayout>
  );
}