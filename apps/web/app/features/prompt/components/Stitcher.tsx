import React, { useMemo } from 'react';
import { VideoResults } from './VideoResults'
import type { Scene } from '@shared/schemas'
import { motion, AnimatePresence } from 'framer-motion'
import { Film } from 'lucide-react'

interface StitcherProps {
  selectedScenes: Set<string>
  toggleSceneSelection: (sceneId: string) => void
  stitchSelectedScenes: (messageId: string) => void
  outputScenes: Scene[]
  messageId: string
  isStitching: boolean
}

export const Stitcher: React.FC<StitcherProps> = ({
  selectedScenes,
  toggleSceneSelection,
  stitchSelectedScenes,
  outputScenes,
  messageId,
  isStitching
}) => {
  const selectedScenesData = useMemo(() => {
    return outputScenes.filter((scene) => selectedScenes.has(scene.id))
  }, [outputScenes, selectedScenes])

  const handleStitch = async () => {
    if (selectedScenes.size === 0) return

    stitchSelectedScenes(messageId)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {outputScenes.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No scenes to stitch yet.</p>
      )}

      {outputScenes.length > 0 && (
        <VideoResults scenes={outputScenes} selectedScenes={selectedScenes} handleSelectScene={toggleSceneSelection} />
      )}

      <AnimatePresence mode="wait">
        {isStitching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="py-20"
          >
            <div className="relative flex items-center justify-center gap-1 mb-16 h-48">
              <div className="flex items-end gap-1">
                {selectedScenesData.slice(0, 5).map((scene, i) => {
                  const stitchDelay = i * 1.2 // Each scene takes 1.2s to stitch

                  return (
                    <React.Fragment key={scene.id}>
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0, x: 100, scale: 0.8 }}
                        animate={{
                          opacity: [0, 1, 1],
                          x: [100, 0, 0],
                          scale: [0.8, 1, 1],
                        }}
                        transition={{
                          duration: 1,
                          delay: stitchDelay,
                          ease: [0.22, 1, 0.36, 1],
                          times: [0, 0.6, 1],
                        }}
                      >
                        <motion.div
                          className="w-24 h-36 rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-800 shadow-xl"
                          animate={{
                            width: i === 0 ? 96 : [96, 96, 8],
                          }}
                          transition={{
                            duration: 0.8,
                            delay: stitchDelay + 0.4,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <img
                            src={scene.thumbnailUrl ? `/thumbnails/${scene.thumbnailUrl}` : undefined}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </motion.div>

                        <motion.div
                          className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-black dark:bg-white flex items-center justify-center text-xs font-semibold text-white dark:text-black"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: stitchDelay + 0.2,
                            duration: 0.3,
                          }}
                        >
                          {i + 1}
                        </motion.div>

                        {i > 0 && (
                          <motion.div
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-linear-to-b from-transparent via-blue-500 to-transparent"
                            initial={{ opacity: 0, scaleY: 0 }}
                            animate={{
                              opacity: [0, 1, 0],
                              scaleY: [0, 1, 1],
                            }}
                            transition={{
                              duration: 0.6,
                              delay: stitchDelay + 0.2,
                            }}
                          />
                        )}

                        <motion.div
                          className="absolute inset-0 bg-white dark:bg-white rounded-lg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0, 0.6, 0] }}
                          transition={{
                            duration: 0.4,
                            delay: stitchDelay + 0.5,
                          }}
                        />
                      </motion.div>
                    </React.Fragment>
                  )
                })}
              </div>

              <motion.div
                className="mx-6"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: selectedScenesData.slice(0, 5).length * 1.2,
                  duration: 0.4,
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-gray-400 dark:text-gray-600"
                >
                  <path
                    d="M5 12h14m0 0l-6-6m6 6l-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: selectedScenesData.slice(0, 5).length * 1.2 + 0.2,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <motion.div
                  className="w-32 h-44 rounded-xl bg-linear-to-br from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-900 border-2 border-gray-200 dark:border-neutral-700 flex flex-col items-center justify-center gap-3 shadow-2xl"
                  animate={{
                    boxShadow: [
                      '0 10px 40px rgba(0,0,0,0.1)',
                      '0 20px 60px rgba(0,0,0,0.15)',
                      '0 10px 40px rgba(0,0,0,0.1)',
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Film className="w-10 h-10 text-gray-400 dark:text-neutral-500" />
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-900 dark:text-white mb-1">Final Video</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedScenesData.length} scene{selectedScenesData.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {selectedScenesData.length > 5 && (
                <motion.div
                  className="absolute right-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    +{selectedScenesData.length - 5} more
                  </div>
                </motion.div>
              )}
            </div>

            <div className="text-center space-y-3">
              <motion.h3
                className="text-lg font-medium text-gray-900 dark:text-white"
                animate={{
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              >
                Stitching scenes together
              </motion.h3>

              <motion.p
                className="text-sm text-gray-500 dark:text-gray-400"
                key={Math.floor(Date.now() / 1200) % (selectedScenesData.length + 1)}
              >
                Processing scene{' '}
                {Math.min(
                  (Math.floor(Date.now() / 1200) % (selectedScenesData.length + 1)) + 1,
                  selectedScenesData.length
                )}{' '}
                of {selectedScenesData.length}
              </motion.p>

              <div className="flex items-center justify-center gap-1.5 pt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600"
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedScenes.size > 0 && !isStitching && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
          <button
            onClick={handleStitch}
            disabled={isStitching}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm text-white bg-black dark:bg-white dark:text-black hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Film className="w-4 h-4" />
            Stitch {selectedScenes.size} scene{selectedScenes.size !== 1 ? 's' : ''}
          </button>
        </motion.div>
      )}
    </div>
  )
}
