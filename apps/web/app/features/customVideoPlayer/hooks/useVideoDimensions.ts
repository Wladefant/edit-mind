import { useState, useEffect, useCallback, type RefObject } from 'react'

export interface VideoDimensions {
  /** Rendered video width in pixels */
  width: number
  /** Rendered video height in pixels */
  height: number
  /** Horizontal offset from container left edge */
  offsetX: number
  /** Vertical offset from container top edge */
  offsetY: number
}

export type ObjectFit = 'contain' | 'cover'

export function useVideoDimensions(
  videoRef: RefObject<HTMLVideoElement | null>,
  overlayRef: RefObject<HTMLDivElement | null>,
  objectFit: ObjectFit = 'contain'
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

    if (objectFit === 'cover') {
      // object-fit: cover - video fills container, may be cropped
      if (containerAspect > videoAspect) {
        width = containerWidth
        height = width / videoAspect
        offsetX = 0
        offsetY = (containerHeight - height) / 2
      } else {
        height = containerHeight
        width = height * videoAspect
        offsetX = (containerWidth - width) / 2
        offsetY = 0
      }
    } else {
      // object-fit: contain - entire video visible, may have letterboxing
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
    }

    setVideoDimensions({ width, height, offsetX, offsetY })
  }, [overlayRef, videoRef, objectFit])

  useEffect(() => {
    const video = videoRef.current
    const container = overlayRef.current
    if (!video || !container) return

    updateVideoDimensions()

    video.addEventListener('loadedmetadata', updateVideoDimensions)

    const resizeObserver = new ResizeObserver(updateVideoDimensions)
    resizeObserver.observe(container)

    window.addEventListener('orientationchange', updateVideoDimensions)

    return () => {
      video.removeEventListener('loadedmetadata', updateVideoDimensions)
      resizeObserver.disconnect()
      window.removeEventListener('orientationchange', updateVideoDimensions)
    }
  }, [updateVideoDimensions, videoRef, overlayRef])

  return { videoDimensions, updateVideoDimensions }
}
