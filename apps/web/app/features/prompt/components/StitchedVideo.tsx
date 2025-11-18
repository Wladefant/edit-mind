import { motion, AnimatePresence } from 'framer-motion'
import { Play } from 'lucide-react';
import { useState } from 'react'

interface StitchedVideoProps {
 stitchedVideoPath: string
}

export function StitchedVideo({ stitchedVideoPath }: StitchedVideoProps) {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)

  return (
    <AnimatePresence>
      <motion.div
        key={stitchedVideoPath}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-3xl"
      >
        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-200 dark:border-neutral-800">
          <div className="px-5 py-3 bg-linear-to-b from-gray-50 to-white dark:from-neutral-900 dark:to-neutral-900/50 border-b border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <a
                href={'/media/' + stitchedVideoPath}
                download
                className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Download
              </a>
            </div>
          </div>

          <div className="relative bg-black aspect-video">
            <video
              src={'/media/' + stitchedVideoPath}
              controls
              className="w-full h-full"
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
            />

            {!isVideoPlaying && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none"
              >
                <div className="w-16 h-16 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center shadow-xl">
                  <Play className="w-7 h-7 text-black ml-1" fill="black" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
