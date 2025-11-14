import { motion } from 'framer-motion'
import { CustomVideoPlayer } from '~/components/CustomVideoPlayer'
import type { VideoWithScenes } from '@shared/types/video'

type VideoResultsProps = {
  videos: VideoWithScenes[]
}

export function VideoResults({ videos }: VideoResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {videos.map((video, idx) => (
        <motion.div
          key={video.source}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
          className="rounded-3xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xl bg-white dark:bg-neutral-900"
        >
          <CustomVideoPlayer
            scenes={video.scenes}
            source={video.source}
            defaultStartTime={video.scenes && video.scenes[0]?.startTime}
            onTimeUpdate={() => {}}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
