import React, { useState, useRef, useEffect } from 'react'
import type { Scene } from '@shared/schemas'
import { Check, Play, Pause, X, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SceneCard } from './SceneCard'

interface VideoResultsProps {
  scenes: Scene[]
  selectedScenes: Set<string>
  handleSelectScene: (sceneId: string) => void
}

export const VideoResults: React.FC<VideoResultsProps> = ({ scenes, selectedScenes, handleSelectScene }) => {
  const [previewScene, setPreviewScene] = useState<Scene | null>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const handlePreview = (e: React.MouseEvent, scene: Scene) => {
    e.stopPropagation()
    setPreviewScene(scene)
  }

  const closePreview = () => {
    setPreviewScene(null)
  }

  const scrollToCard = (index: number) => {
    const card = cardRefs.current.get(index)
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard events if preview modal is open
      if (previewScene) return

      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const newIndex = Math.max(0, prev - 1)
            scrollToCard(newIndex)
            return newIndex
          })
          break

        case 'ArrowRight':
          e.preventDefault()
          setFocusedIndex((prev) => {
            const newIndex = Math.min(scenes.length - 1, prev + 1)
            scrollToCard(newIndex)
            return newIndex
          })
          break

        case ' ':
          e.preventDefault()
          if (scenes[focusedIndex]) {
            setPreviewScene(scenes[focusedIndex])
          }
          break

        case 'Enter':
          e.preventDefault()
          if (scenes[focusedIndex]) {
            handleSelectScene(scenes[focusedIndex].id)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [scenes, focusedIndex, previewScene, handleSelectScene])

  const setCardRef = (index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(index, el)
    } else {
      cardRefs.current.delete(index)
    }
  }

  return (
    <>
      <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {scenes.map((scene, index) => (
          <div key={scene.id} ref={setCardRef(index)}>
            <SceneCard
              scene={scene}
              isSelected={selectedScenes.has(scene.id)}
              isFocused={index === focusedIndex}
              onSelect={() => handleSelectScene(scene.id)}
              onPreview={(e) => handlePreview(e, scene)}
              onFocus={() => setFocusedIndex(index)}
            />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {previewScene && (
          <PreviewModal
            scene={previewScene}
            isSelected={selectedScenes.has(previewScene.id)}
            onClose={closePreview}
            onToggleSelect={() => handleSelectScene(previewScene.id)}
          />
        )}
      </AnimatePresence>

      <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        Use <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">←</kbd>{' '}
        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">→</kbd> to navigate,{' '}
        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Space</kbd> to preview,{' '}
        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Enter</kbd> to select
      </div>
    </>
  )
}

interface PreviewModalProps {
  scene: Scene
  isSelected: boolean
  onClose: () => void
  onToggleSelect: () => void
}

const PreviewModal: React.FC<PreviewModalProps> = ({ scene, isSelected, onClose, onToggleSelect }) => {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const startTime = scene.startTime || 0
  const endTime = scene.endTime || 0
  const duration = endTime - startTime

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = startTime

    const handleLoadedMetadata = () => {
      video.currentTime = startTime
      video.play().catch(() => setIsPlaying(false))
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)

      if (video.currentTime >= endTime) {
        video.currentTime = startTime
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [startTime, endTime])

  // Keyboard controls for preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break

        case ' ':
          e.preventDefault()
          togglePlayPause()
          break

        case 'Enter':
          e.preventDefault()
          onToggleSelect()
          break

        case 'r':
        case 'R':
          e.preventDefault()
          restartScene()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onToggleSelect])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const restartScene = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = startTime
    video.play()
  }

  const progress = duration > 0 ? ((currentTime - startTime) / duration) * 100 : 0

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative max-w-4xl w-full bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="relative aspect-video bg-black group">
          <video
            ref={videoRef}
            src={scene.source ? `/media/${scene.source}` : undefined}
            className="w-full h-full"
            playsInline
          >
            Your browser does not support the video tag.
          </video>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4">
              <button
                onClick={restartScene}
                className="w-12 h-12 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-colors"
              >
                <RotateCcw className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white" fill="white" />
                ) : (
                  <Play className="w-8 h-8 text-white ml-1" fill="white" />
                )}
              </button>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-white font-mono">{formatTime(currentTime - startTime)}</span>
              <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className="text-xs text-white font-mono">{formatTime(duration)}</span>
            </div>
            <div className="text-xs text-gray-400">
              Scene: {formatTime(startTime)} - {formatTime(endTime)}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{scene.source}</h3>
          </div>

          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                isSelected ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-white hover:bg-gray-100 text-black'
              }`}
            >
              {isSelected ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Selected
                </span>
              ) : (
                'Select for Stitching'
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg font-medium text-sm bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
            >
              Close
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Space</kbd> play/pause •{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">R</kbd> restart •{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Enter</kbd> select •{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd> close
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}