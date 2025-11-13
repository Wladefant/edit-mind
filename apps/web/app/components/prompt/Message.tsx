import type { ChatMessage } from '@prisma/client'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export function Message({ id, sender, text }: ChatMessage) {
  const isUser = sender === 'user'

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2 py-2`}
    >
      {!isUser && (
        <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-tr from-purple-500/10 to-indigo-500/10 flex items-center justify-center shadow-sm backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
      )}

      {text &&
        <div
          className={`
          max-w-[70%] rounded-2xl px-4 py-2 text-[15px] leading-snug
          font-[450] backdrop-blur-md border transition-colors duration-200
          ${isUser
              ? 'bg-linear-to-tr from-blue-500/90 to-blue-400/80 text-white border-blue-400/30 shadow-sm'
              : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-900 dark:text-neutral-100 border-neutral-200/40 dark:border-neutral-800/60 shadow-sm'
            }
        `}
          style={{
            boxShadow: isUser ? '0 2px 10px rgba(37, 99, 235, 0.15)' : '0 2px 10px rgba(0, 0, 0, 0.06)',
          }}
        >
          {text}
        </div>
      }
    </motion.div>
  )
}
