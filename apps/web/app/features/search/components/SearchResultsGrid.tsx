import { motion } from 'framer-motion'
import { VideoCard } from './VideoCard'
import { LayoutGrid, List } from 'lucide-react'
import type { VideoWithScenes } from '@shared/types/video'

interface SearchResultsGridProps {
  videos: VideoWithScenes[]
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
}

export function SearchResultsGrid({ 
  videos, 
  viewMode, 
  onViewModeChange 
}: SearchResultsGridProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'grid' 
              ? 'bg-gray-200 dark:bg-white/20 text-black dark:text-white' 
              : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500'
          }`}
          aria-label="Grid view"
        >
          <LayoutGrid size={20} />
        </button>
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-md transition-colors ${
            viewMode === 'list' 
              ? 'bg-gray-200 dark:bg-white/20 text-black dark:text-white' 
              : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500'
          }`}
          aria-label="List view"
        >
          <List size={20} />
        </button>
      </div>

      <motion.div
        layout
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'flex flex-col gap-4'
        }
      >
        {videos.map((video, index) => (
          <motion.div
            key={video.source}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <VideoCard video={video} viewMode={viewMode} />
          </motion.div>
        ))}
      </motion.div>
    </>
  )
}