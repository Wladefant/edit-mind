import { useState } from 'react'
import { Link } from 'react-router-dom'

export function VideoCard({ video }: { video: any }) {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <Link
      to={`/app/videos?source=/${video.source}`}
      className="relative cursor-pointer group overflow-hidden rounded-3xl bg-white/10 dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-2xl duration-300"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="w-full h-full">
        {isHovering ? (
          <video
            src={`/thumbnails/${video.thumbnailUrl.replace('.jpg', '.mp4')}`} // Assuming a mp4 preview exists
            autoPlay
            loop
            muted
            className={`object-cover w-full h-full ${video.aspect_ratio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} rounded-3xl`}
          />
        ) : (
          <img
            src={`/thumbnails/${video.thumbnailUrl}`}
            alt={video.fileName}
            className={`object-cover w-full h-full ${video.aspect_ratio === '16:9' ? 'aspect-video' : 'aspect-[9/16]'} rounded-3xl`}
          />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none" />

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
          {Math.round(parseFloat(video.duration.toString()))} sec
        </span>
      </div>
    </Link>
  )
}
