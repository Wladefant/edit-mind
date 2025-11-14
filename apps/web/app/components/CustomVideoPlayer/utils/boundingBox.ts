import type { BoundingBox } from '@shared/types/scene'
import type { VideoDimensions } from '../types'

export function calculateBoundingBoxPosition(
  bbox: BoundingBox,
  videoDimensions: VideoDimensions,
  videoElement: HTMLVideoElement
) {
  const { width, height, offsetX, offsetY } = videoDimensions
  const scaleX = width / videoElement.videoWidth
  const scaleY = height / videoElement.videoHeight

  return {
    left: offsetX + bbox.x * scaleX,
    top: offsetY + bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  }
}

export function shouldShowOverlay(
  overlayMode: 'all' | 'faces' | 'objects' | 'text' | 'none',
  type: 'face' | 'object' | 'text'
): boolean {
  return (
    overlayMode === 'all' ||
    (overlayMode === 'faces' && type === 'face') ||
    (overlayMode === 'objects' && type === 'object') ||
    (overlayMode === 'text' && type === 'text')
  )
}
