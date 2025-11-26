import type { OverlayMode, OverlayType } from '../types'


export function shouldShowOverlay(overlayMode: OverlayMode, type: OverlayType): boolean {
  return (
    overlayMode === 'all' ||
    (overlayMode === 'faces' && type === 'face') ||
    (overlayMode === 'objects' && type === 'object') ||
    (overlayMode === 'text' && type === 'text') ||
    (overlayMode === 'captions' && type === 'captions')
  )
}
