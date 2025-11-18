import type { Video } from '@shared/types/video'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export function VideoCard({ video, viewMode }: { video: Video; viewMode: 'grid' | 'list' }) {
  const [isHovering, setIsHovering] = useState(false)

  const aspectClass = video.aspect_ratio === '16:9' ? 'aspect-video' : 'aspect-9/16'
  const containerClass = viewMode === 'grid' ? 'w-full' : 'flex gap-4 items-center h-32'
  return (
    <Link
      to={`/app/videos?source=${video.source}`}
      className={`relative cursor-pointer group overflow-hidden rounded-3xl bg-white/10 dark:bg-white/5 ${containerClass}
                 border border-gray-100 dark:border-white/10 backdrop-blur-sm transition-all 
                 hover:scale-[1.02] hover:shadow-2xl duration-300`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`w-full h-full relative ${aspectClass}`}>
        <img
          src={`/thumbnails/${video.thumbnailUrl}`}
          alt={video.fileName}
          className={`object-cover w-full h-full rounded-3xl transition-opacity duration-200 
                     ${isHovering ? 'opacity-0' : 'opacity-100'}`}
        />

        <video
          src={`/media/${video.source}`}
          autoPlay
          muted
          loop
          className={`object-cover w-full h-full rounded-3xl absolute inset-0 transition-opacity duration-200
                     ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          poster={`/thumbnails/${video.thumbnailUrl}`}
        />
      </div>

      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none" />

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm">
        <div className="flex flex-col">
          <span className="font-medium text-[15px] leading-tight truncate drop-shadow-sm">{video.fileName}</span>
          <span className="text-base text-gray-200">
            {new Date(video.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <span className="bg-white/25 backdrop-blur-md text-[12px] px-2 py-0.5 rounded-md">
          {Math.round(Number(video.duration))} sec
        </span>
      </div>
    </Link>
  )
}
