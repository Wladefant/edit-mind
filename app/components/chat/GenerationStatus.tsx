import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import { GenerationResult } from '@/lib/types/search'

interface GenerationStatusProps {
  generationStatus: string | null
  generationResult: GenerationResult | null
  onOpenVideo: () => void
  onShowInFinder: () => void
}

export const GenerationStatus = ({
  generationStatus,
  generationResult,
  onOpenVideo,
  onShowInFinder,
}: GenerationStatusProps) => {
  useEffect(() => {
    if (generationResult) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff7f50', '#ffdb4d', '#4caf50', '#2196f3'],
      })
    }
  }, [generationResult])

  if (!generationStatus) return null

  return (
    <motion.div
      key="generation-status"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`generation-status ${generationStatus.startsWith('Error') ? 'error' : 'success'}`}
    >
      <div className="status-message">{generationStatus}</div>

      <AnimatePresence>
        {generationResult && (
          <motion.div
            key="generation-actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="generation-actions"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button primary"
              onClick={onOpenVideo}
            >
              <span className="action-icon">▶️</span>
              Open Video
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="action-button tertiary"
              onClick={onShowInFinder}
            >
              <span className="action-icon">📁</span>
              Show in Finder
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
