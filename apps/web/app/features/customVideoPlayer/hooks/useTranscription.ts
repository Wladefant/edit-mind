import { useState, useEffect } from 'react'
import type { Scene } from '@shared/types/scene'

export function useTranscription(currentTime: number, currentScene: Scene | null) {
  const [activeTranscriptionWord, setActiveTranscriptionWord] = useState('')

  useEffect(() => {
    if (!currentScene?.transcriptionWords) {
      setActiveTranscriptionWord('')
      return
    }

    const word = currentScene.transcriptionWords.find((w) => currentTime >= w.start && currentTime <= w.end)

    setActiveTranscriptionWord(word?.word || '')
  }, [currentTime, currentScene])

  return activeTranscriptionWord
}
