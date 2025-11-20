import { Link } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Smile, Frown, Meh, Camera, Package, Play, Pause } from 'lucide-react'

interface VideoMetadata {
  faces?: string[]
  emotions?: string[]
  objects?: string[]
  shotTypes?: string[]
}

interface VideoCardProps {
  source: string
  fileName?: string
  thumbnailUrl?: string
  duration: number
  createdAt: string
  aspectRatio: '16:9' | '9:16'
  metadata?: VideoMetadata
}

const emotionIcons = {
  happy: Smile,
  sad: Frown,
  neutral: Meh,
}

export function VideoCard({
  source,
  fileName,
  thumbnailUrl,
  duration,
  createdAt,
  aspectRatio,
  metadata,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout>(null)

  const videoPreviewUrl = `/media/${source}`

  useEffect(() => {
    if (isHovered && videoRef.current) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsPlaying(true)
        videoRef.current?.play().catch(() => {
        })
      }, 500)
    } else if (videoRef.current && hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      setIsPlaying(false)
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [isHovered])

  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })

  const hasMetadata =
    metadata &&
    (metadata.faces?.length || metadata.emotions?.length || metadata.objects?.length || metadata.shotTypes?.length)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative"
    >
      <Link
        to={`/app/videos?source=/${source}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative cursor-pointer group overflow-hidden rounded-3xl 
          bg-white/10 dark:bg-white/5  backdrop-blur-sm 
          transition-all duration-300 block

        `}
      >
        {hasMetadata && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMetadata(!showMetadata)
            }}
            className="absolute top-3 right-3 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm 
                       rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}

        <div className="relative w-full h-full">
          <img
            src={`/thumbnails/${thumbnailUrl}`}
            alt={fileName}
            className={`
              object-cover w-full h-full rounded-3xl transition-opacity duration-300
              ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
              ${isPlaying ? 'opacity-0' : 'opacity-100'}
            `}
          />

          <video
            ref={videoRef}
            src={videoPreviewUrl}
            muted
            loop
            playsInline
            className={`
              absolute inset-0 object-cover w-full h-full rounded-3xl transition-opacity duration-300
              ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
              ${isPlaying ? 'opacity-100' : 'opacity-0'}
            `}
          />

          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-black/40 backdrop-blur-sm rounded-full p-4">
                  {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none rounded-3xl" />

        <AnimatePresence>
          {showMetadata && metadata && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md p-4 rounded-3xl overflow-auto"
              onClick={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                {metadata.faces && metadata.faces.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-300">
                      <User className="w-3 h-3" />
                      <span className="font-medium">People</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.faces.slice(0, 5).map((face, idx) => (
                        <div key={idx} className="text-xs bg-blue-500/20 text-blue-200 border-blue-500/30">
                          {face}
                        </div>
                      ))}
                      {metadata.faces.length > 5 && <div className="text-xs">+{metadata.faces.length - 5}</div>}
                    </div>
                  </div>
                )}

                {metadata.emotions && metadata.emotions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-300">
                      <Smile className="w-3 h-3" />
                      <span className="font-medium">Emotions</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.emotions.slice(0, 3).map((emotion, idx) => {
                        const Icon = emotionIcons[emotion as keyof typeof emotionIcons]
                        return (
                          <div
                            key={idx}
                            className="text-xs bg-yellow-500/20 text-yellow-200 border-yellow-500/30 flex items-center gap-1"
                          >
                            {Icon && <Icon className="w-3 h-3" />}
                            {emotion}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {metadata.objects && metadata.objects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-300">
                      <Package className="w-3 h-3" />
                      <span className="font-medium">Objects</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.objects.slice(0, 4).map((object, idx) => (
                        <div key={idx} className="text-xs bg-green-500/20 text-green-200 border-green-500/30">
                          {object}
                        </div>
                      ))}
                      {metadata.objects.length > 4 && <div className="text-xs">+{metadata.objects.length - 4}</div>}
                    </div>
                  </div>
                )}

                {metadata.shotTypes && metadata.shotTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-300">
                      <Camera className="w-3 h-3" />
                      <span className="font-medium">Shot Types</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.shotTypes.map((shotType, idx) => (
                        <div key={idx} className="text-xs bg-purple-500/20 text-purple-200 border-purple-500/30">
                          {shotType}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showMetadata && metadata && (
          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            {metadata.faces && metadata.faces.length > 0 && (
              <div className="bg-blue-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{metadata.faces.length}</span>
              </div>
            )}
            {metadata.objects && metadata.objects.length > 0 && (
              <div className="bg-green-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span>{metadata.objects.length}</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm pointer-events-none">
          <div className="flex flex-col">
            <span className="font-medium text-[15px] leading-tight truncate drop-shadow-sm max-w-[180px]">
              {fileName}
            </span>
            <span className="text-sm text-gray-200">{formattedDate}</span>
          </div>
          <span className="bg-white/25 backdrop-blur-md text-xs px-2 py-1 rounded-md">{Math.round(duration)} sec</span>
        </div>
      </Link>
    </motion.div>
  )
}
