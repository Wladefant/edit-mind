import { motion } from 'framer-motion'
import type { VideoWithScenes } from '@shared/types/video'
import { VideoCard } from '~/features/shared/components/VideoCard'

interface SearchResultsGridProps {
  videos: VideoWithScenes[]
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export function SearchResultsGrid({ videos, viewMode }: SearchResultsGridProps) {
  return (
    <motion.div
      layout
      className={
        viewMode === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 z-0'
          : 'flex flex-col gap-4'
      }
    >
      {videos.map((video) => (
        <VideoCard
          key={video.source}
          source={video.source}
          thumbnailUrl={video.thumbnailUrl}
          duration={parseFloat(video.duration.toString())}
          createdAt={video.createdAt}
          aspectRatio={video?.aspect_ratio === '9:16' ? '9:16' : '16:9'}
          metadata={{}}
        />
      ))}
    </motion.div>
  )
}
