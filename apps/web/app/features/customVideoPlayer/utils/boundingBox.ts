import type { BoundingBox } from '@shared/types/scene'
import type { OverlayMode, OverlayType, VideoDimensions } from '../types'

export function calculateBoundingBoxPosition(bbox: BoundingBox, videoDimensions: VideoDimensions) {
  const { offsetX, offsetY } = videoDimensions

  return {
    left: offsetX + bbox.x,
    top: offsetY + bbox.y,
    width: bbox.width,
    height: bbox.height,
  }
}

export function shouldShowOverlay(overlayMode: OverlayMode, type: OverlayType): boolean {
  return (
    overlayMode === 'all' ||
    (overlayMode === 'faces' && type === 'face') ||
    (overlayMode === 'objects' && type === 'object') ||
    (overlayMode === 'text' && type === 'text') ||
    (overlayMode === 'captions' && type === 'captions')
  )
}
