import type { ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useChat(chatId?: string) {
  const [messages, setMessages] = useState<(ChatMessage & { outputScenes: Scene[] })[]>([])
  const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set())
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!chatId) {
      setMessages([])
      setSelectedScenes(new Set())
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

    const tempUserMessage:(ChatMessage & { outputScenes: Scene[] }) = {
      id: `temp-${Date.now()}`,
      chatId: chatId || '',
      sender: 'user',
      text: prompt,
      outputSceneIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      outputScenes: [],
      stitchedVideoPath: null
    }

    setMessages((prev) => [...prev, tempUserMessage])

    try {
      if (!chatId) {
        const res = await fetch(`/api/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })

        if (!res.ok) throw new Error('Failed to create chat')

        const { chatId: newChatId } = await res.json()

        navigate(`/app/prompt/${newChatId}`)
      } else {
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
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id))
      setInput(prompt)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const toggleSceneSelection = (sceneId: string) => {
    setSelectedScenes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId)
      } else {
        newSet.add(sceneId)
      }
      return newSet
    })
  }

  const stitchSelectedScenes = async (messageId: string) => {
    if (selectedScenes.size === 0) return

    const res = await fetch(`/api/messages/${messageId}/stitcher`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedSceneIds: Array.from(selectedScenes) }),
    })

    if (!res.ok) throw new Error('Failed to stitch scenes')

    const assistantMessage = await res.json()
    setMessages((prev) => [...prev, assistantMessage])
    setSelectedScenes(new Set())
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
    selectedScenes,
    toggleSceneSelection,
    setSelectedScenes,
    stitchSelectedScenes,
  }
}
