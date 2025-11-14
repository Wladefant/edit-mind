import { motion } from 'framer-motion'
import { User, Tag, Type } from 'lucide-react'
import type { BoundingBoxProps, OverlayType } from '../types'
import { OVERLAY_COLORS } from '../constants/styles'
import { calculateBoundingBoxPosition } from '../utils/boundingBox'
import { formatConfidence } from '../utils/formatting'

const ICONS: Record<OverlayType, React.ReactNode> = {
  face: <User size={14} className="text-white" />,
  object: <Tag size={14} className="text-white" />,
  text: <Type size={14} className="text-white" />,
}

export function BoundingBox({
  bbox,
  label,
  type,
  confidence,
  videoDimensions,
  videoElement,
}: BoundingBoxProps) {
  if (!bbox || !videoElement || videoDimensions.width === 0) return null

  const position = calculateBoundingBoxPosition(bbox, videoDimensions, videoElement)
  const confidenceDisplay = formatConfidence(confidence)

  const style = {
    left: `${position.left}px`,
    top: `${position.top}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute border-[3px] rounded-xl backdrop-blur-sm pointer-events-none ${OVERLAY_COLORS[type]}`}
      style={style}
    >
      <div className="absolute -top-9 left-0 px-3 py-1.5 rounded-lg bg-black/80 shadow-xl flex items-center gap-2">
        {ICONS[type]}
        <span className="text-xs text-white font-semibold">{label}</span>
        {confidenceDisplay && (
          <span className="text-xs text-white/70 font-medium ml-1">{confidenceDisplay}</span>
        )}
      </div>
    </motion.div>
  )
}
