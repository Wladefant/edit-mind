import { Link } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Smile, Frown, Meh, Camera, Package, Play, Pause, ImageOff } from 'lucide-react'
import { formatDate, formatDuration, intervalToDuration } from 'date-fns'

interface VideoMetadata {
  faces?: string[]
  emotions?: string[]
  objects?: string[]
  shotTypes?: string[]
}

interface VideoCardProps {
  source: string
  thumbnailUrl?: string
  duration: number
  createdAt: number
  aspectRatio: string
  metadata?: VideoMetadata
}

const emotionIcons = {
  happy: Smile,
  sad: Frown,
  neutral: Meh,
}

export function VideoCard({
  source,
  thumbnailUrl,
  duration,
  createdAt,
  aspectRatio = '16:9',
  metadata,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const PREVIEW_DURATION = 5
  const fileName = source.split('/')[source.split('/').length - 1]

  useEffect(() => {
    const video = videoRef.current
    if (!video || videoError) return

    const handleTimeUpdate = () => {
      setProgress((video.currentTime / PREVIEW_DURATION) * 100)
      if (video.currentTime >= PREVIEW_DURATION) {
        video.pause()
        video.currentTime = 0
        setIsPlaying(false)
        setProgress(0)
      }
    }

    const handleError = () => {
      setVideoError(true)
      setIsPlaying(false)
    }

    if (isHovered && !imageError) {
      hoverTimeoutRef.current = setTimeout(() => {
        video
          .play()
          .then(() => {
            setIsPlaying(true)
            video.addEventListener('timeupdate', handleTimeUpdate)
          })
          .catch(handleError)
      }, 500)
    } else {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      video.pause()
      video.currentTime = 0
      setIsPlaying(false)
      setProgress(0)
      video.removeEventListener('timeupdate', handleTimeUpdate)
    }

    video.addEventListener('error', handleError)

    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('error', handleError)
    }
  }, [isHovered, videoError, imageError])

  const hasMetadata =
    metadata &&
    (metadata.faces?.length || metadata.emotions?.length || metadata.objects?.length || metadata.shotTypes?.length)

  const minHeight = aspectRatio === '16:9' ? 'min-h-[250px]' : 'min-h-[350px]'

  const formatVideoDuration = (seconds: number): string => {
    const durationObj = intervalToDuration({ start: 0, end: seconds * 1000 })

    // For very short videos (< 1 minute), show seconds
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }

    return formatDuration(durationObj, {
      delimiter: ' ',
    })
      .replace(/(\d+)\s+hours?/, '$1h')
      .replace(/(\d+)\s+minutes?/, '$1m')
      .replace(/(\d+)\s+seconds?/, '$1s')
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative"
    >
      <Link
        to={`/app/videos?source=${encodeURIComponent(source)}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
    relative cursor-pointer group overflow-hidden rounded-2xl 
    bg-white/10 dark:bg-white/5 backdrop-blur-sm 
    transition-all duration-300 block
    ${minHeight}
  `}
      >
        {isHovered && !imageError && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 rounded-b-2xl overflow-hidden z-30">
            <motion.div
              className="h-full bg-white"
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.3 }}
            />
          </div>
        )}

        {hasMetadata && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMetadata(!showMetadata)
            }}
            className="absolute top-3 right-3 z-30 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm 
                       rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
            aria-label="Toggle metadata"
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

        <div className={`relative w-full h-full ${minHeight}`}>
          {imageError ? (
            <div
              className={`
              flex flex-col items-center justify-center w-full h-full rounded-2xl
              bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900
              ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
              ${minHeight}
            `}
            >
              <ImageOff className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-500">Thumbnail unavailable</p>
            </div>
          ) : (
            <>
              <img
                src={thumbnailUrl ? `/thumbnails/${encodeURIComponent(thumbnailUrl)}` : ''}
                alt={fileName || 'Video thumbnail'}
                onError={() => setImageError(true)}
                className={`
                  object-cover w-full h-full rounded-2xl transition-opacity duration-300
                  ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
                  ${minHeight}
                  ${isPlaying ? 'opacity-0' : 'opacity-100'}
                `}
              />

              {!videoError && (
                <video
                  ref={videoRef}
                  src={'/media/' + source}
                  muted
                  loop
                  preload="metadata"
                  playsInline
                  onError={() => setVideoError(true)}
                  className={`
                    absolute inset-0 object-cover w-full h-full rounded-2xl transition-opacity duration-300
                    ${aspectRatio === '16:9' ? 'aspect-video' : 'aspect-9/16'}
                    ${minHeight}
                    ${isPlaying ? 'opacity-100' : 'opacity-0'}
                  `}
                />
              )}
            </>
          )}

          <AnimatePresence>
            {isHovered && !imageError && !videoError && (
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

        {!imageError && (
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none rounded-2xl" />
        )}

        <AnimatePresence>
          {showMetadata && metadata && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={`absolute inset-0 bg-black/90 backdrop-blur-md p-4 z-20 rounded-2xl overflow-hidden ${minHeight}`}
              onClick={(e) => e.preventDefault()}
            >
              <div className="space-y-3">
                {metadata.faces && metadata.faces.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-medium">People</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.faces.slice(0, 5).map((face, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-500/20 text-blue-200 border border-blue-500/30 px-2 py-1 rounded-md"
                        >
                          {face}
                        </span>
                      ))}
                      {metadata.faces.length > 5 && (
                        <span className="text-xs text-gray-400 px-2 py-1">+{metadata.faces.length - 5}</span>
                      )}
                    </div>
                  </div>
                )}

                {metadata.emotions && metadata.emotions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                      <Smile className="w-3.5 h-3.5" />
                      <span className="font-medium">Emotions</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.emotions.slice(0, 3).map((emotion, idx) => {
                        const Icon = emotionIcons[emotion as keyof typeof emotionIcons]
                        return (
                          <span
                            key={idx}
                            className="text-xs bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 px-2 py-1 rounded-md flex items-center gap-1"
                          >
                            {Icon && <Icon className="w-3 h-3" />}
                            {emotion}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}

                {metadata.objects && metadata.objects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                      <Package className="w-3.5 h-3.5" />
                      <span className="font-medium">Objects</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.objects.slice(0, 4).map((object, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-green-500/20 text-green-200 border border-green-500/30 px-2 py-1 rounded-md"
                        >
                          {object}
                        </span>
                      ))}
                      {metadata.objects.length > 4 && (
                        <span className="text-xs text-gray-400 px-2 py-1">+{metadata.objects.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                {metadata.shotTypes && metadata.shotTypes.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                      <Camera className="w-3.5 h-3.5" />
                      <span className="font-medium">Shot Types</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {metadata.shotTypes.map((shotType, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-purple-500/20 text-purple-200 border border-purple-500/30 px-2 py-1 rounded-md"
                        >
                          {shotType}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showMetadata && metadata && !imageError && (
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            {metadata.faces && metadata.faces.length > 0 && (
              <div className="bg-blue-500/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <User className="w-3 h-3" />
                <span>{metadata.faces.length}</span>
              </div>
            )}
            {metadata.objects && metadata.objects.length > 0 && (
              <div className="bg-green-500/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <Package className="w-3 h-3" />
                <span>{metadata.objects.length}</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm pointer-events-none z-10">
          <div className="flex flex-col flex-1 min-w-0 mr-2">
            <span className="font-medium text-base leading-tight truncate drop-shadow-sm">
              {fileName || 'Untitled Video'}
            </span>
            <span className="text-sm text-gray-200 drop-shadow-sm">{formatDate(createdAt, 'MMMM d, yyyy HH:mm:ss')}</span>
          </div>
          <span className="bg-black/50 backdrop-blur-md text-sm font-medium px-2.5 py-1 rounded-md whitespace-nowrap shadow-sm">
            {formatVideoDuration(duration)}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
