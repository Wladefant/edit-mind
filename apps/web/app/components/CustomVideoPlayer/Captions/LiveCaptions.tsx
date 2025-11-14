import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import type { Scene } from '@shared/types/scene'

interface LiveCaptionsProps {
  currentScene: Scene | null
  activeTranscriptionWord: string
}

export function LiveCaptions({ currentScene, activeTranscriptionWord }: LiveCaptionsProps) {
  if (!currentScene?.transcription || !activeTranscriptionWord) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-3xl px-4"
    >
      <div className="bg-black/90 backdrop-blur-xl px-6 py-4 rounded-2xl border-2 border-white/30 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={16} className="text-blue-400" strokeWidth={2.5} />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Live Captions</span>
        </div>
        <p className="text-white text-lg text-center font-light leading-relaxed">
          {currentScene.transcriptionWords?.map((word, i) => (
            <span
              key={i}
              className={`transition-all duration-150 ${
                word.word === activeTranscriptionWord
                  ? 'text-blue-400 font-bold scale-110 inline-block drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]'
                  : 'text-gray-300'
              }`}
            >
              {word.word}{' '}
            </span>
          ))}
        </p>
      </div>
    </motion.div>
  )
}
