import type { ChatMessage } from '@prisma/client';
import type { Scene } from '@shared/schemas'
import { motion } from 'framer-motion'
import { Sparkles, Clock, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Stitcher } from './Stitcher'
import { StitchedVideo } from './StitchedVideo'

interface MessageProps extends ChatMessage {
  outputScenes: Scene[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
  stitchSelectedScenes: (messageId: string) => void
  isStitching: boolean
}

export function Message({
  id,
  sender,
  text,
  createdAt,
  tokensUsed,
  outputScenes,
  selectedScenes,
  handleSelectScene,
  stitchSelectedScenes,
  stitchedVideoPath,
  isStitching,
  isError,
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

        <div className="flex flex-col gap-2 max-w-[75%]">
          {isError ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="mt-2 px-4 py-3 rounded-2xl bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 text-sm"
            >
              {text}
            </motion.div>
          ) : (
            text && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className={`
                rounded-2xl px-4 py-3 text-[15px] leading-relaxed
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
            )
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={`flex items-center gap-3 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500">
              <Clock className="w-3 h-3" strokeWidth={2.5} />
              <span className="font-medium">
                {formatDistanceToNow(new Date(createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            {!isUser && tokensUsed > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 dark:border-purple-500/20">
                <Zap className="w-3 h-3 text-purple-600 dark:text-purple-400" strokeWidth={2.5} />
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  {tokensUsed.toLocaleString()}
                </span>
                <span className="text-xs text-purple-600/60 dark:text-purple-400/60">tokens</span>
              </div>
            )}
          </motion.div>
        </div>
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
            isStitching={isStitching}
          />
        </motion.div>
      )}

      {stitchedVideoPath && <StitchedVideo stitchedVideoPath={stitchedVideoPath} />}
    </div>
  )
}
