import type { Scene } from '@shared/schemas'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { motion } from 'framer-motion'

export default function ScenesList({
  scenes,
  activeScene,
  onSceneClick,
}: {
  scenes: Scene[]
  activeScene?: Scene
  onSceneClick: (scene: Scene) => void
}) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: scenes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
  })

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto max-h-[calc(100vh-200px)]"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const scene = scenes[virtualRow.index]
          const isActive = scene.id === activeScene?.id

          return (
            <motion.div
              key={scene.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: virtualRow.index * 0.02 }}
              onClick={() => onSceneClick(scene)}
              className={`flex items-center gap-4 p-2 rounded-lg cursor-pointer transition
                ${
                  isActive
                    ? 'bg-blue-100 dark:bg-gray-900/40 border border-gray-400 shadow-sm'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-900 border border-transparent'
                }`}
              style={{
                position: 'absolute',
                top: virtualRow.start,
                left: 0,
                width: '100%',
              }}
            >
              <img
                src={'/thumbnails/' + scene.thumbnailUrl}
                alt={`Scene ${virtualRow.index + 1}`}
                className={`w-24 h-16 object-cover rounded-md transition ${
                  isActive ? 'ring-2 ring-gray-400' : ''
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium transition truncate ${
                    isActive
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-black dark:text-white'
                  }`}
                >
                  {scene.description}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {scene.startTime}s - {scene.endTime}s
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
