import { useState, useCallback, useEffect, type RefObject } from 'react'

export function useVideoProgress(videoRef: RefObject<HTMLVideoElement | null>, onTimeUpdate: (time: number) => void) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }
  }, [videoRef])

  useEffect(() => {
    onTimeUpdate(currentTime)
  }, [currentTime, onTimeUpdate])

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video) return

      video.currentTime = time
      video.play()
    },
    [videoRef]
  )

  const skipTo = useCallback(
    (time: number) => {
      const video = videoRef.current
      if (!video) return

      video.currentTime = time
    },
    [videoRef]
  )

  return { currentTime, duration, seekTo, skipTo }
}
