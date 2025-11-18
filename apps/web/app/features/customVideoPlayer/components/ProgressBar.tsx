import { AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { ProgressBarProps } from '../types'
import { ScenePreview } from './ScenePreview'
import { formatTime } from '../utils/formatting'
import type { Scene } from '@shared/types/scene'

export function ProgressBar({
  scenes,
  duration,
  currentTime,
  onSeek,
  onHoverScene,
  onHoverPosition,
}: ProgressBarProps) {
  const [hoverScene, setHoverScene] = useState<Scene | null>(null)
  const [hoverX, setHoverX] = useState(0)

  const handleSceneClick = (e: React.MouseEvent, scene: Scene) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const fraction = clickX / rect.width
    const targetTime = scene.startTime + fraction * (scene.endTime - scene.startTime)
    onSeek(targetTime)
  }

  const handleSceneHover = (e: React.MouseEvent, scene: Scene) => {
    const rect = e.currentTarget.closest('.progress-container')?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    setHoverX(x)
    setHoverScene(scene)
    onHoverScene(scene)
    onHoverPosition(x)
  }

  const handleMouseLeave = () => {
    setHoverScene(null)
    onHoverScene(null)
  }

  return (
    <div>
      <div className="relative flex w-full h-2 gap-0.5 cursor-pointer progress-container rounded-full overflow-hidden">
        {scenes.map((scene, i) => {
          const width = ((scene.endTime - scene.startTime) / duration) * 100
          const sceneProgress =
            currentTime > scene.endTime
              ? 100
              : currentTime >= scene.startTime
                ? ((currentTime - scene.startTime) / (scene.endTime - scene.startTime)) * 100
                : 0

          return (
            <div
              key={i}
              onClick={(e) => handleSceneClick(e, scene)}
              onMouseMove={(e) => handleSceneHover(e, scene)}
              onMouseLeave={handleMouseLeave}
              className="relative flex-1 group/segment"
              style={{ width: `${width}%` }}
            >
              <div className="absolute inset-0 bg-white/20 group-hover/segment:bg-white/30 transition-colors rounded-sm" />
              <div
                className="absolute left-0 top-0 h-full bg-white transition-all duration-100 rounded-sm"
                style={{ width: `${sceneProgress}%` }}
              />
            </div>
          )
        })}

        <AnimatePresence>
          {hoverScene && <ScenePreview scene={hoverScene} hoverX={hoverX} formatTime={formatTime} />}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-gray-400 font-medium">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}
