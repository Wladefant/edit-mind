import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { useChat } from '../features/prompt/hooks/useChat'
import { useLoaderData, useParams, type LoaderFunctionArgs, type MetaFunction, useRouteLoaderData } from 'react-router'
import { getVideosMetadataSummary } from '@shared/services/vectorDb'
import { generateSearchSuggestions } from '@shared/utils/search'
import { ChatHistory } from '~/features/prompt/components/ChatHistory'
import { Welcome } from '~/features/prompt/components/Welcome'
import { MessageList } from '~/features/prompt/components/MessageList'
import { LoadingIndicator } from '~/features/prompt/components/LoadingIndicator'
import { ChatInput } from '~/features/prompt/components/ChatInput'

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
    input,
    isLoading,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
    messages,
    messagesEndRef,
    selectedScenes,
    toggleSceneSelection,
    stitchSelectedScenes,
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
                <MessageList
                  messages={messages}
                  selectedScenes={selectedScenes}
                  handleSelectScene={toggleSceneSelection}
                  stitchSelectedScenes={stitchSelectedScenes}
                />
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
