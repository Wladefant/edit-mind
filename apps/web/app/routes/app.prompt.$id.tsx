import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { useChat } from '../hooks/useChat'
import { Welcome } from '../components/prompt/Welcome'
import { MessageList } from '../components/prompt/MessageList'
import { LoadingIndicator } from '../components/prompt/LoadingIndicator'
import { ChatInput } from '../components/prompt/ChatInput'
import { useLoaderData, useParams, type LoaderFunctionArgs, type MetaFunction, useRouteLoaderData } from 'react-router'
import { getVideosMetadataSummary } from '@shared/services/vectorDb'
import { generateSearchSuggestions } from '@shared/utils/search'
import { ChatHistory } from '~/components/prompt/ChatHistory'

export const meta: MetaFunction = () => {
  return [{ title: 'Prompt | Edit Mind' }]
}
export async function loader({ params }: LoaderFunctionArgs) {
  const metadata = await getVideosMetadataSummary()
  const suggestions = generateSearchSuggestions(metadata)
  const chatId = params.id
  if (!chatId) throw new Response('Chat ID required', { status: 400 })

  return { suggestions }
}

export default function ChatPage() {
  const { id } = useParams()
  const { chats } = useRouteLoaderData('routes/app') as { chats: any[] }

  const {
    messages,
    input,
    isLoading,
    messagesEndRef,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
  } = useChat(id)
  const { suggestions } = useLoaderData<typeof loader>()

  return (
    <DashboardLayout sidebar={<ChatHistory chats={chats} />}>
      <div className="flex flex-col h-full min-h-screen">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <AnimatePresence mode="wait">
            {messages.length === 0 ? (
              <Welcome onSuggestionClick={handleSuggestionClick} suggestions={suggestions} />
            ) : (
              <div className="max-w-4xl mx-auto space-y-6 pb-8">
                <MessageList messages={messages} />
                {isLoading && <LoadingIndicator />}
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
  )
}
