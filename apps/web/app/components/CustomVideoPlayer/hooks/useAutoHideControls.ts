import { useState, useEffect, useRef, useCallback } from 'react'
import { CONTROLS_HIDE_DELAY } from '../constants/config'

export function useAutoHideControls(isPlaying: boolean) {
  const [showControls, setShowControls] = useState(true)
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleMouseMove = useCallback(() => {
    setShowControls(true)
  }, [])

  useEffect(() => {
    if (showControls && isPlaying) {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current)
      }

      controlsTimeout.current = setTimeout(() => {
        setShowControls(false)
      }, CONTROLS_HIDE_DELAY)
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current)
      }
    }
  }, [showControls, isPlaying])

  return {
    showControls,
    setShowControls,
    handleMouseMove,
  }
}
