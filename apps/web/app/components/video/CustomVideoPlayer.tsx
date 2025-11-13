import type { Scene } from '@shared/types/scene'
import { useRef, useState, useEffect, useCallback } from 'react'

interface CustomVideoPlayerProps {
  source: string
  scenes?: Scene[]
  title?: string
  defaultStartTime?: number
  onTimeUpdate: (time: number) => void
}
export function CustomVideoPlayer({
  source,
  scenes = [],
  title,
  defaultStartTime,
  onTimeUpdate,
}: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(defaultStartTime || 0)
  const [duration, setDuration] = useState(0)
  const [hoverScene, setHoverScene] = useState<any | null>(null)
  const [hoverX, setHoverX] = useState(0)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onLoaded = () => setDuration(v.duration || 0)
    const onTime = () => setCurrentTime(v.currentTime)
    const onPause = () => setIsPlaying(false)
    const onPlaying = () => setIsPlaying(true)

    v.addEventListener('loadedmetadata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('pause', onPause)
    v.addEventListener('playing', onPlaying)

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
    }
  }, [])

  useEffect(() => {
    onTimeUpdate(currentTime)
    return () => onTimeUpdate(0)
  }, [currentTime, onTimeUpdate])

  useEffect(() => {
    if (defaultStartTime) skipTo(defaultStartTime)
  }, [defaultStartTime])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setIsPlaying(true)
    } else {
      v.pause()
      setIsPlaying(false)
    }
  }, [])

  const seekTo = (time: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = time
    v.play()
    setIsPlaying(true)
  }

  const skipTo = (time: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = time
  }

  return (
    <div className="relative w-full h-[calc(100vh-30rem)] rounded-xl overflow-hidden bg-black group shadow-md">
      <video
        ref={videoRef}
        src={source}
        poster={'/thumbnails/' + scenes[0]?.thumbnailUrl}
        className="w-full h-full object-contain md:object-cover bg-black"
        onClick={togglePlay}
      />

      {title && (
        <div className="absolute top-6 left-6 text-white text-sm bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm">
          {title}
        </div>
      )}

      <div className="absolute bottom-0 w-full h-20 bg-linear-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

      <div className="absolute bottom-6 left-6 right-6 h-2 bg-transparent rounded-full flex items-center cursor-pointer progress-container">
        <div className="relative flex w-full h-full gap-1">
          {scenes.map((s, i) => {
            const width = ((s.endTime - s.startTime) / duration) * 100
            const active = currentTime >= s.startTime && currentTime <= s.endTime
            const sceneProgress =
              currentTime > s.endTime
                ? 100
                : currentTime >= s.startTime
                  ? ((currentTime - s.startTime) / (s.endTime - s.startTime)) * 100
                  : 0

            return (
              <div
                key={i}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const fraction = clickX / rect.width
                  const targetTime = s.startTime + fraction * (s.endTime - s.startTime)
                  seekTo(targetTime)
                }}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.closest('.progress-container')?.getBoundingClientRect()
                  if (!rect) return
                  setHoverX(e.clientX - rect.left)
                  setHoverScene(s)
                }}
                onMouseLeave={() => setHoverScene(null)}
                className="relative flex-1 rounded-sm overflow-hidden"
                style={{ width: `${width}%` }}
              >
                <div className="absolute inset-0 bg-white/25" />
                <div
                  className="absolute left-0 top-0 h-full bg-white transition-all duration-100"
                  style={{ width: `${sceneProgress}%`, opacity: active ? 0.9 : 0.7 }}
                />
              </div>
            )
          })}

          {hoverScene && (
            <div
              className="absolute bottom-14 z-30 flex flex-col items-center"
              style={{
                left: `${hoverX}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="w-[180px] h-[100px] rounded-lg overflow-hidden border border-white/20 shadow-lg">
                <img
                  src={'/thumbnails/' + hoverScene.thumbnailUrl}
                  alt={hoverScene.description}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-1 text-sm text-white bg-black/70 px-2 py-0.5 rounded-md backdrop-blur-sm whitespace-nowrap">
                {hoverScene.description}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isPlaying && (
        <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center focus:outline-none">
          <div className="w-20 h-20 bg-white/15 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm hover:bg-white/25 transition">
            <svg className="w-10 h-10 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
    </div>
  )
}
