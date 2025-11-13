// useChat.ts
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

type Message = {
  id: string
  chatId: string
  sender: 'user' | 'assistant'
  text: string
  outputSceneIds: string[]
  outputScenes: any[] | null
  createdAt: Date
}

export function useChat(chatId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      return
    }

    async function fetchMessages() {
      try {
        const res = await fetch(`/api/chats/${chatId}/messages`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        setMessages(data)

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }

    fetchMessages()
  }, [chatId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const prompt = input.trim()
    setInput('')
    setIsLoading(true)

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      chatId: chatId || '',
      sender: 'user',
      text: prompt,
      outputSceneIds: [],
      outputScenes: null,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, tempUserMessage])

    try {
      if (!chatId) {
        // Create new chat and get first message
        const res = await fetch(`/api/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })

        if (!res.ok) throw new Error('Failed to create chat')

        const { chatId: newChatId } = await res.json()

        // Navigate to the new chat, which will trigger the loader to fetch all messages
        navigate(`/app/prompt/${newChatId}`)
      } else {
        // Send message to existing chat
        const res = await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })

        if (!res.ok) throw new Error('Failed to send message')

        const assistantMessage = await res.json()
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      // Restore input
      setInput(prompt)
      // TODO: Show error toast/notification
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  return {
    messages,
    input,
    isLoading,
    messagesEndRef,
    inputRef,
    setInput,
    sendMessage,
    handleSuggestionClick,
  }
}
