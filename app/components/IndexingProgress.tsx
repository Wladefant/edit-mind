import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Circle, Loader } from 'lucide-react'

export type IndexingProgressProps = {
  video: string
  step: 'transcription' | 'frame-analysis' | 'embedding'
  progress: number
  success: boolean
  stepIndex: number
  thumbnailUrl?: string
}

const steps = [
  { id: 'transcription', name: 'Transcription' },
  { id: 'frame-analysis', name: 'Frame Analysis' },
  { id: 'embedding', name: 'Embedding' },
]

export const IndexingProgress = ({
  video,
  step,
  progress,
  success,
  thumbnailUrl,
}: IndexingProgressProps) => {
  const currentStepIndex = steps.findIndex((s) => s.id === step)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="indexing-progress"
        className="indexing-progress-container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{
          duration: 0.4,
          ease: [0.16, 1, 0.3, 1], 
        }}
      >
        <div className="indexing-progress-content">
          {thumbnailUrl && (
            <motion.div 
              className="thumbnail-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <img src={thumbnailUrl} alt={video} className="thumbnail-image" />
              <motion.div 
                className="thumbnail-overlay" 
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </motion.div>
          )}
          
          <div className="indexing-header">
            <motion.h2 
              className="indexing-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Indexing in Progress
            </motion.h2>
            <motion.p 
              className="indexing-video-name"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {video}
            </motion.p>
          </div>

          <div className="steps-container">
            {steps.map((s, index) => {
              const isCompleted = index < currentStepIndex || success
              const isCurrent = index === currentStepIndex && !success
              
              return (
                <motion.div 
                  key={s.id} 
                  className={`step ${isCurrent ? 'step-current' : ''} ${isCompleted ? 'step-completed' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="step-icon">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <CheckCircle size={20} className="text-green-500" />
                      </motion.div>
                    ) : isCurrent ? (
                      <Loader size={20} className="animate-spin text-blue-500" />
                    ) : (
                      <Circle size={20} className="text-gray-400" />
                    )}
                  </div>
                  <span className="step-name">{s.name}</span>
                </motion.div>
              )
            })}
          </div>

          <div className="progress-section">
            <div className="progress-bar-container">
              <motion.div 
                className="progress-bar" 
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <motion.p 
              className="progress-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {progress}% complete
            </motion.p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}