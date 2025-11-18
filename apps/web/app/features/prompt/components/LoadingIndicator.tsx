import { motion } from 'framer-motion'
import { Sparkles, Film, MessageSquare } from 'lucide-react'

interface LoadingIndicatorProps {
  type?: 'searching' | 'thinking' | 'generating'
}

export function LoadingIndicator({ type = 'thinking' }: LoadingIndicatorProps) {
  const getLoadingText = () => {
    switch (type) {
      case 'searching':
        return 'Searching videos...'
      case 'generating':
        return 'Generating response...'
      default:
        return 'Thinking...'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'searching':
        return <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2} />
      case 'generating':
        return <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2} />
      default:
        return <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-start items-end gap-3"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center backdrop-blur-sm border border-purple-500/10"
      >
        <motion.div
          animate={{
            scale: type === 'thinking' ? [1, 1.1, 1] : 1,
          }}
          transition={{
            scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="text-white"
        >
          {getIcon()}
        </motion.div>
      </motion.div>

      <div className="bg-gray-100 dark:bg-neutral-800 border border-gray-200/50 dark:border-neutral-700/50 rounded-2xl px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"
                animate={{
                  y: [0, -8, 0],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <motion.span
            className="text-sm text-white"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {getLoadingText()}
          </motion.span>
        </div>
      </div>
    </motion.div>
  )
}
