import { useEffect, useState } from 'react'
import { Link, useFetcher, useLoaderData, useNavigate, type MetaFunction } from 'react-router'
import { CustomVideoPlayer } from '~/features/customVideoPlayer/components'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { deleteByVideoSource, getByVideoSource, updateMetadata, updateScenesSource } from '@shared/services/vectorDb'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { existsSync } from 'fs'
import { RelinkVideo } from '~/features/videos/components/RelinkVideo'
import { DeleteVideo } from '~/features/videos/components/DeleteVideo'
import { getUser } from '~/services/user.sever'
import { prisma } from '~/services/database'
import fs from 'fs/promises'
import { videoActionSchema } from '~/features/videos/schemas'
import { Check, AlertCircle, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ScenesList from '~/features/videos/components/ScenesList'
import { PROCESSED_VIDEOS_DIR, THUMBNAILS_DIR } from '@shared/constants'
import path from 'path'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')

  if (!source) {
    throw new Response('Video not found', { status: 404 })
  }

  const scenes = await getByVideoSource(decodeURIComponent(source))
  const videoExist = existsSync(source)

  if (!scenes || scenes.length === 0) {
    throw new Response('Scenes not found', { status: 404 })
  }

  return { scenes, source, videoExist }
}

export async function action({ request }: { request: Request }) {
  try {
    const user = await getUser(request)
    if (!user) return { success: false, error: 'No user authenticated' }

    const form = await request.formData()
    const parsed = videoActionSchema.safeParse(Object.fromEntries(form))
    if (!parsed.success) {
      console.error(parsed.error)
      return { success: false, error: 'Invalid action payload' }
    }
    const action = parsed.data

    if (action.intent === 'update-aspect-ratio') {
      try {
        const scenes = await getByVideoSource(action.source)
        const modifiedScenes = scenes.map((scene) => ({
          ...scene,
          aspect_ratio: action.newRatio,
        }))

        for (const scene of modifiedScenes) {
          await updateMetadata(scene)
        }
        return { success: true, message: 'Aspect ratio updated successfully', newRatio: action.newRatio }
      } catch (error) {
        console.error(error)
        return { success: false, error: 'Failed to update video aspect ratio' }
      }
    }

    if (action.intent === 'relink-video') {
      const { oldSource, newSource } = action

      try {
        await fs.access(newSource)

        await prisma.job.updateMany({
          where: { videoPath: oldSource },
          data: { videoPath: newSource },
        })

        await updateScenesSource(oldSource, newSource)
        return { success: true, redirectLink: `/app/videos?source=${newSource}` }
      } catch {
        return { success: false, error: 'Failed to access or create folder/video' }
      }
    }
    if (action.intent === 'delete-video') {
      const { source } = action
      try {
        const scenes = await getByVideoSource(source)

        const thumbnailDir = THUMBNAILS_DIR
        for (const scene of scenes) {
          if (scene.thumbnailUrl) {
            const thumbPath = path.join(thumbnailDir, scene.thumbnailUrl)
            if (existsSync(thumbPath)) {
              await fs.unlink(thumbPath)
            }
          }
        }

        await deleteByVideoSource(source)

        await prisma.job.deleteMany({
          where: { videoPath: source },
        })

        const videoFileName = path.basename(source)
        const analysisResultDir = path.join(PROCESSED_VIDEOS_DIR, videoFileName)
        if (existsSync(analysisResultDir)) {
          await fs.rm(analysisResultDir, { recursive: true, force: true })
        }

        return { success: true }
      } catch (e) {
        console.error('Error deleting video:', e)
        return { success: false, error: 'Failed to delete video and its assets.' }
      }
    }
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to update video' }
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.source) {
    return [{ title: 'Video not found | Edit Mind' }]
  }

  const fileName = data.source.split('/').pop() || 'File'

  return [
    {
      title: `${fileName} | Edit Mind`,
    },
  ]
}

export default function Video() {
  const data = useLoaderData<typeof loader>()
  const relinkFetcher = useFetcher()
  const aspectFetcher = useFetcher()
  const deleteFetcher = useFetcher()

  const navigate = useNavigate()

  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(data.scenes[0])
  const [relinkModalOpen, setRelinkModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [relinkSuccess, setRelinkSuccess] = useState(false)

  const [selectedAspectRatio, setSelectedAspectRatio] = useState(activeScene?.aspect_ratio || '16:9')

  const onRelink = (oldSource: string, newSource: string) => {
    relinkFetcher.submit({ oldSource, newSource, intent: 'relink-video' }, { method: 'post', action: '/app/videos' })
  }

  const onDelete = (source: string) => {
    deleteFetcher.submit({ source, intent: 'delete-video' }, { method: 'post', action: '/app/videos' })
  }

  useEffect(() => {
    if (relinkFetcher.data) {
      if ('redirectLink' in relinkFetcher.data) {
        setRelinkModalOpen(false)
        setRelinkSuccess(true)
        navigate(relinkFetcher.data.redirectLink)
      } else if ('error' in relinkFetcher.data) {
        setRelinkSuccess(false)
        alert(relinkFetcher.data.error)
      }
    }
  }, [navigate, relinkFetcher.data])

  useEffect(() => {
    if (deleteFetcher.data) {
      if (deleteFetcher.data.success) {
        setDeleteModalOpen(false)
        navigate('/app/home')
      } else if (deleteFetcher.data.error) {
        alert(deleteFetcher.data.error)
      }
    }
  }, [deleteFetcher.data, navigate])

  useEffect(() => {
    if (aspectFetcher.data) {
      if (aspectFetcher.data.success) {
        if (aspectFetcher.data.newRatio) {
          setSelectedAspectRatio(aspectFetcher.data.newRatio)
        }
      }
    }
  }, [aspectFetcher.data])

  useEffect(() => {
    const time = Math.round(currentTime * 100) / 100
    const scene = data.scenes.find((scene) => time >= scene.startTime && time < scene.endTime)

    if (scene && scene.id !== activeScene?.id) {
      setActiveScene(scene)
      setSelectedAspectRatio(scene.aspect_ratio || '16:9')
    }
  }, [currentTime, data.scenes, activeScene?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeScene || !data.scenes) return

      const videoEl = document.querySelector('video')
      if (!videoEl) return

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          if (videoEl.paused) {
            videoEl.play()
          } else {
            videoEl.pause()
          }
          break
        case 'ArrowRight':
          {
            e.preventDefault()
            const currentIndex = data.scenes.findIndex((s) => s.id === activeScene.id)
            if (currentIndex < data.scenes.length - 1) {
              const nextScene = data.scenes[currentIndex + 1]
              videoEl.currentTime = nextScene.startTime
              setActiveScene(nextScene)
              setDefaultStartTime(nextScene.startTime)
              setSelectedAspectRatio(nextScene.aspect_ratio || '16:9')
            }
          }
          break
        case 'ArrowLeft':
          {
            e.preventDefault()
            const currentIndex = data.scenes.findIndex((s) => s.id === activeScene.id)
            if (currentIndex > 0) {
              const prevScene = data.scenes[currentIndex - 1]
              videoEl.currentTime = prevScene.startTime
              setActiveScene(prevScene)
              setDefaultStartTime(prevScene.startTime)
              setSelectedAspectRatio(prevScene.aspect_ratio || '16:9')
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScene, data.scenes])

  const onUpdateAspectRatio = () => {
    if (!selectedAspectRatio) return

    aspectFetcher.submit(
      { newRatio: selectedAspectRatio, intent: 'update-aspect-ratio', source: data.source },
      { method: 'post', action: '/app/videos' }
    )
  }

  const isUpdatingAspectRatio = aspectFetcher.state !== 'idle'
  const hasAspectRatioChanged = selectedAspectRatio !== activeScene?.aspect_ratio

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-black dark:text-white">Your video</h3>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full font-medium text-sm hover:bg-red-700 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Video
            </button>
          </div>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex max-h-full flex-col gap-4">
            <RelinkVideo
              isOpen={relinkModalOpen}
              oldSource={data.source}
              onClose={() => setRelinkModalOpen(false)}
              onRelink={onRelink}
            />

            <DeleteVideo
              isOpen={deleteModalOpen}
              source={data.source}
              onClose={() => setDeleteModalOpen(false)}
              onDelete={onDelete}
            />

            <AnimatePresence>
              {relinkSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg flex items-center gap-2"
                >
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-green-800 dark:text-green-200">Video has been successfully relinked!</span>
                </motion.div>
              )}
            </AnimatePresence>

            {!data.videoExist ? (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-yellow-800 dark:text-yellow-200">Video file is missing. Please relink.</span>
                <button
                  onClick={() => setRelinkModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Relink
                </button>
              </div>
            ) : (
              <CustomVideoPlayer
                source={'/media/' + data.source}
                scenes={data.scenes}
                title={data.source}
                defaultStartTime={defaultStartTime}
                onTimeUpdate={setCurrentTime}
              />
            )}

            <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900/60 backdrop-blur-md shadow-sm">
              <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3">Update Aspect Ratio</h5>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <select
                  name="newRatio"
                  value={selectedAspectRatio}
                  onChange={(e) => {
                    setSelectedAspectRatio(e.target.value)
                  }}
                  disabled={isUpdatingAspectRatio}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select ratio</option>
                  <option value="16:9">16:9 (Landscape)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                  <option value="1:1">1:1 (Square)</option>
                  <option value="4:5">4:5 (Portrait)</option>
                  <option value="21:9">21:9 (Ultrawide)</option>
                </select>

                <button
                  type="button"
                  onClick={onUpdateAspectRatio}
                  disabled={isUpdatingAspectRatio || !hasAspectRatioChanged || !selectedAspectRatio}
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
                >
                  {isUpdatingAspectRatio ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>
              </div>

              <AnimatePresence mode="wait">
                {aspectFetcher.data?.success && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Aspect ratio updated successfully!</span>
                  </motion.div>
                )}

                {aspectFetcher.data?.error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>{aspectFetcher.data?.error || 'Failed to update aspect ratio'}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasAspectRatioChanged && !isUpdatingAspectRatio && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Current: {activeScene?.aspect_ratio || 'Not set'} → New: {selectedAspectRatio}
                </p>
              )}
            </div>

            {activeScene && (
              <div className="rounded-xl border border-gray-300 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-6 shadow-sm transition">
                <div className="flex items-start gap-6">
                  <img
                    src={'/thumbnails/' + activeScene.thumbnailUrl}
                    alt="Scene thumbnail"
                    className="w-40 h-24 rounded-lg object-cover shadow-md"
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Scene #{data.scenes.findIndex((scene) => scene.id === activeScene.id) + 1}
                      </h4>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {activeScene.startTime}s – {activeScene.endTime}s
                      </span>
                    </div>

                    <p className="text-gray-800 dark:text-gray-300 mb-2 leading-relaxed">{activeScene.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-sm text-gray-700 dark:text-gray-400">
                      {activeScene.category && (
                        <p>
                          <span className="font-semibold">Category:</span> {activeScene.category}
                        </p>
                      )}
                      <p>
                        <span className="font-semibold">Shot Type:</span> {activeScene.shot_type}
                      </p>
                      <p>
                        <span className="font-semibold">Camera:</span> {activeScene.camera}
                      </p>
                      <p>
                        <span className="font-semibold">Location:</span> {activeScene.location}
                      </p>
                      <p>
                        <span className="font-semibold">Aspect Ratio:</span> {activeScene.aspect_ratio || 'N/A'}
                      </p>
                      <p className="col-span-2 sm:col-span-1">
                        <span className="font-semibold">Source:</span>{' '}
                        <span className="text-xs truncate">{activeScene.source.split('/').pop()}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {activeScene.emotions?.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-2">Detected Emotions:</h5>
                    <div className="flex flex-wrap gap-2">
                      {activeScene.emotions.map((emotion) => (
                        <span
                          key={emotion.emotion}
                          className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-gray-800 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-gray-700"
                        >
                          {emotion.emotion}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-300">Dominant Color:</span>
                  <div
                    className="w-6 h-6 rounded-full border border-gray-400"
                    style={{ backgroundColor: activeScene.dominantColorHex }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-400">{activeScene.dominantColorName}</span>
                </div>

                {activeScene.transcription && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-2">Transcription:</h5>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-40 overflow-y-auto">
                      {activeScene.transcription}
                    </div>
                  </div>
                )}

                {activeScene.detectedText && activeScene.detectedText.length > 0 && (
                  <div className="mt-6">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-2">Detected Text:</h5>
                    <div className="flex flex-wrap gap-2">
                      {activeScene.detectedText.map((text, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs text-gray-800 dark:text-gray-300"
                        >
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">Scenes ({data.scenes.length})</h2>
            <div className="space-y-4">
              <ScenesList
                scenes={data.scenes}
                activeScene={data.scenes.find((scene) => scene.id === activeScene.id)}
                onSceneClick={(scene) => {
                  setActiveScene(scene)
                  setDefaultStartTime(scene.startTime + 0.1)
                  setSelectedAspectRatio(scene.aspect_ratio || '16:9')
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}

export function ErrorBoundary() {
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full text-center"
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Video Not Found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto"
          >
            We couldn't find the video you're looking for. It may have been moved, deleted, or the link might be
            incorrect.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/app/home"
              className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-90 active:scale-95 transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ delay: 0.6 }}
            className="mt-16 flex items-center justify-center gap-8"
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-600"
              />
            ))}
          </motion.div>
        </motion.div>
      </main>
    </DashboardLayout>
  )
}
