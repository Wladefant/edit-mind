import { motion } from 'framer-motion'
import type { Scene } from '@shared/types/scene'

interface LiveCaptionsProps {
  currentScene: Scene | null
  activeTranscriptionWord: string
}

export function LiveCaptions({ currentScene, activeTranscriptionWord }: LiveCaptionsProps) {
  if (!currentScene?.transcription || !activeTranscriptionWord) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-30 left-1/2 -translate-x-1/2 px-4 w-full max-w-3xl pointer-events-none"
    >
      <div className="bg-black/60 px-4 py-2 rounded-md">
        <p className="text-white text-center text-lg leading-snug">
          {currentScene.transcriptionWords?.map((word, i) => (
            <span key={i} className={word.word === activeTranscriptionWord ? '' : 'truncate'}>
              {word.word}
            </span>
          ))}
        </p>
      </div>
    </motion.div>
  )
}
