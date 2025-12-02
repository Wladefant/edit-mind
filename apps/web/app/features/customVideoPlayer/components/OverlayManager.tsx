import { AnimatePresence } from 'framer-motion'
import { BoundingBox } from './BoundingBox'
import type { OverlayManagerProps } from '../types'
import { shouldShowOverlay } from '../utils/overlays'

export function OverlayManager({
  currentScene,
  overlayMode,
  showOverlays,
  videoDimensions,
  videoRef,
}: OverlayManagerProps) {
  const videoElement = videoRef.current

  if (!showOverlays || !videoElement || !currentScene) return null

  return (
    <AnimatePresence mode="sync">
      {currentScene.facesData?.map((face, i) => {
        if (!shouldShowOverlay(overlayMode, 'face')) return null
        return (
          <BoundingBox
            key={`face-${currentScene.id}-${i}`}
            bbox={face.bbox}
            label={face.name}
            type="face"
            confidence={face.confidence}
            videoDimensions={videoDimensions}
            videoElement={videoElement}
          />
        )
      })}

      {currentScene.objectsData
        ?.filter((obj) => obj.label !== 'person')
        .map((obj, i) => {
          if (!shouldShowOverlay(overlayMode, 'object')) return null
          return (
            <BoundingBox
              key={`object-${currentScene.id}-${i}`}
              bbox={obj.bbox}
              label={obj.label}
              type="object"
              confidence={obj.confidence}
              videoDimensions={videoDimensions}
              videoElement={videoElement}
            />
          )
        })}

      {currentScene.detectedTextData?.map((text, i) => {
        if (!shouldShowOverlay(overlayMode, 'text')) return null
        return (
          <BoundingBox
            key={`text-${currentScene.id}-${i}`}
            bbox={text.bbox}
            label={text.text}
            type="text"
            confidence={text.confidence}
            videoDimensions={videoDimensions}
            videoElement={videoElement}
          />
        )
      })}
    </AnimatePresence>
  )
}
