import '@/app/styles/Welcome.css'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderCheckIcon, FolderIcon, PlayIcon, VideoIcon } from 'lucide-react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { IndexingProgress, IndexingProgressProps } from '@/app/components/index/IndexingProgress'
import { FeatureItem } from '@/app/components/index/FeatureItem'
import { ThunderIcon } from '@/app/icons/ThunderIcon'
import { Button } from '@/app/components/ui/Button'
import { IndexIcon } from '@/app/icons/IndexIcon'

export const Index = () => {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [videos, setVideos] = useState<string[]>([])
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexingProgress, setIndexingProgress] = useState<IndexingProgressProps | null>(null)
  const appApi = useConveyor('app')

  useEffect(() => {
    if (!appApi) return

    const unsubscribe = appApi.on('indexing-progress', (progress) => {
      setIndexingProgress(progress)
    })

    return () => {
      unsubscribe()
    }
  }, [appApi])

  const handleSelectFolder = async () => {
    if (!appApi) return
    const result = await appApi.selectFolder()
    if (result) {
      setSelectedFolder(result.folderPath)
      setVideos(result.videos)
    }
  }

  const handleStartIndexing = async () => {
    if (!appApi) return
    setIsIndexing(true)
    await appApi.startIndexing(videos)
    setIsIndexing(false)
  }

  return (
    <div className="welcome-content-wrapper">
      <div className="welcome-content flex flex-col gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key="welcome-screen"
            className="welcome-main-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.5,
              ease: 'easeOut',
            }}
          >
            <motion.div
              className="welcome-text-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h1 className="welcome-title">Welcome to Edit Mind</h1>
              <p className="welcome-subtitle">Your intelligent video indexing and management system</p>

              {!selectedFolder ? (
                <div className="welcome-action-section">
                  <p className="welcome-instruction">
                    To get started, select a folder containing your video files. Edit Mind will automatically index and
                    organize your content.
                  </p>

                  <Button size="lg" onClick={handleSelectFolder} className="welcome-primary-button">
                    <FolderIcon />
                    Select Video Folder
                  </Button>

                  <div className="welcome-features">
                    <FeatureItem
                      icon={<VideoIcon />}
                      title="Auto-Detection"
                      description="Automatically finds all video files"
                    />
                    <FeatureItem
                      icon={<IndexIcon />}
                      title="Smart Indexing"
                      description="Creates searchable metadata"
                    />
                    <FeatureItem
                      icon={<ThunderIcon />}
                      title="Create rough cuts"
                      description="Create clips based on your prompt"
                    />
                  </div>
                </div>
              ) : (
                <div className="welcome-action-section">
                  <div className="selected-folder-display">
                    <div className="folder-path-container">
                      <FolderCheckIcon />
                      <div className="folder-path-text">
                        <span className="folder-label">Selected folder:</span>
                        <span className="folder-path">{selectedFolder}</span>
                        {videos.length} videos
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFolder(null)}
                      className="change-folder-btn"
                    >
                      Change
                    </Button>
                  </div>

                  {!isIndexing ? (
                    <Button
                      size="lg"
                      onClick={handleStartIndexing}
                      className="welcome-primary-button start-indexing-btn"
                    >
                      <PlayIcon />
                      Start Indexing
                    </Button>
                  ) : (
                    indexingProgress && <IndexingProgress {...indexingProgress} />
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
