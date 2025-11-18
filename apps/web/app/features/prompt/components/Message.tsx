import type { ChatMessage } from '@prisma/client'
import type { Scene } from '@shared/schemas'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Stitcher } from './Stitcher'
import { StitchedVideo } from './StitchedVideo'

interface MessageProps extends ChatMessage {
  outputScenes: Scene[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
  stitchSelectedScenes: (messageId: string) => Promise<void>
}

export function Message({
  id,
  sender,
  text,
  outputScenes,
  selectedScenes,
  handleSelectScene,
  stitchSelectedScenes,
  stitchedVideoPath,
}: MessageProps) {
  const isUser = sender === 'user'

  return (
    <div className="space-y-4">
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-3`}
      >
        {!isUser && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center backdrop-blur-sm border border-purple-500/10"
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={2} />
          </motion.div>
        )}

        {text && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.05, duration: 0.3 }}
            className={`
              max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed
              font-normal backdrop-blur-sm transition-all duration-200
              ${
                isUser
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 border border-gray-200/50 dark:border-neutral-700/50'
              }
            `}
          >
            {text}
          </motion.div>
        )}
      </motion.div>

      {outputScenes && outputScenes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Stitcher
            selectedScenes={selectedScenes}
            toggleSceneSelection={handleSelectScene}
            stitchSelectedScenes={stitchSelectedScenes}
            outputScenes={outputScenes}
            messageId={id}
          />
        </motion.div>
      )}

      {stitchedVideoPath && <StitchedVideo stitchedVideoPath={stitchedVideoPath} />}
    </div>
  )
}
