import { useState, useEffect, useCallback, type RefObject } from 'react'

interface VideoDimensions {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

export function useVideoDimensions(
  videoRef: RefObject<HTMLVideoElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>
) {
  const [videoDimensions, setVideoDimensions] = useState<VideoDimensions>({
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
  })

  const updateVideoDimensions = useCallback(() => {
    const video = videoRef.current
    const container = overlayRef.current
    if (!video || !container || !video.videoWidth || !video.videoHeight) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const videoAspect = video.videoWidth / video.videoHeight
    const containerAspect = containerWidth / containerHeight

    let width: number, height: number, offsetX: number, offsetY: number

    if (containerAspect > videoAspect) {
      height = containerHeight
      width = height * videoAspect
      offsetX = (containerWidth - width) / 2
      offsetY = 0
    } else {
      width = containerWidth
      height = width / videoAspect
      offsetX = 0
      offsetY = (containerHeight - height) / 2
    }

    setVideoDimensions({ width, height, offsetX, offsetY })
  }, [overlayRef, videoRef])

  useEffect(() => {
    updateVideoDimensions()

    window.addEventListener('resize', updateVideoDimensions)
    window.addEventListener('orientationchange', updateVideoDimensions)

    return () => {
      window.removeEventListener('resize', updateVideoDimensions)
      window.removeEventListener('orientationchange', updateVideoDimensions)
    }
  }, [updateVideoDimensions])

  return { videoDimensions, updateVideoDimensions }
}
