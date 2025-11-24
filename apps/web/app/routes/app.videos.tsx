import { useEffect, useState } from 'react'
import { useFetcher, useLoaderData, useNavigate, type MetaFunction } from 'react-router'
import { CustomVideoPlayer } from '~/features/customVideoPlayer/components'
import { DashboardLayout } from '~/layouts/DashboardLayout'
import { getByVideoSource, updateScenesSource } from '@shared/services/vectorDb'
import { Sidebar } from '~/features/shared/components/Sidebar'
import { existsSync } from 'fs'
import { RelinkVideo } from '~/features/videos/components/RelinkVideo'
import { getUser } from '~/services/user.sever'
import { prisma } from '~/services/database'
import fs from 'fs/promises'

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
    const data = await request.formData()
    const oldSource = data.get('oldSource')?.toString()
    const newSource = data.get('newSource')?.toString()

    if (!user) return { success: false, error: 'No user authenticated' }
    if (!newSource || !oldSource) return { success: false, error: 'No path provided' }

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
  } catch (error) {
    console.error(error)
    return { success: false, error: 'Failed to relink video' }
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
  const navigate = useNavigate()

  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(data.scenes[0])
  const [relinkModalOpen, setRelinkModalOpen] = useState(false)
  const [relinkSuccess, setRelinkSuccess] = useState(false)

  const onRelink = (oldSource: string, newSource: string) => {
    relinkFetcher.submit({ oldSource, newSource }, { method: 'post', action: '/app/videos' })
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
  }, [navigate, relinkFetcher])
  useEffect(() => {
    const time = Math.round(currentTime * 100) / 100
    const scene = data.scenes.find((scene) => time >= scene.startTime && time < scene.endTime)

    if (scene && scene.id !== activeScene?.id) {
      setActiveScene(scene)
    }
  }, [currentTime, data.scenes, activeScene])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeScene || !data.scenes) return

      const videoEl = document.querySelector('video')
      if (!videoEl) return

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
            const currentIndex = data.scenes.findIndex((s) => s.id === activeScene.id)
            if (currentIndex < data.scenes.length - 1) {
              const nextScene = data.scenes[currentIndex + 1]
              videoEl.currentTime = nextScene.startTime
              setActiveScene(nextScene)
              setDefaultStartTime(nextScene.startTime)
            }
          }
          break
        case 'ArrowLeft':
          {
            const currentIndex = data.scenes.findIndex((s) => s.id === activeScene.id)
            if (currentIndex > 0) {
              const prevScene = data.scenes[currentIndex - 1]
              videoEl.currentTime = prevScene.startTime
              setActiveScene(prevScene)
              setDefaultStartTime(prevScene.startTime)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScene, data.scenes])

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-6">Your video</h3>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex max-h-full flex-col gap-4">
            <RelinkVideo
              isOpen={relinkModalOpen}
              oldSource={data.source}
              onClose={() => setRelinkModalOpen(false)}
              onRelink={onRelink}
            />
            {relinkSuccess && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-800 dark:text-green-200">
                Video has been successfully relinked!
              </div>
            )}

            {!data.videoExist ? (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
                      <p>
                        <span className="font-semibold">Source:</span> {activeScene.source}
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

                {activeScene.detectedText?.length > 0 && (
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
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">Scenes</h2>
            <div className="space-y-4">
              {data.scenes.map((scene) => {
                const isActive = scene.id === activeScene.id
                return (
                  <div
                    key={`${scene.startTime}_${scene.endTime}`}
                    onClick={() => {
                      setActiveScene(scene)
                      setDefaultStartTime(scene.startTime + 0.1)
                    }}
                    className={`flex items-center gap-4 p-2 rounded-lg cursor-pointer transition
                    ${
                      isActive
                        ? 'bg-blue-100 dark:bg-gray-900/40 border border-gray-400 shadow-sm'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-900 border border-transparent'
                    }`}
                  >
                    <img
                      src={'/thumbnails/' + scene.thumbnailUrl}
                      className={`w-24 h-16 object-cover rounded-md transition ${
                        isActive ? 'ring-2 ring-gray-400' : ''
                      }`}
                    />
                    <div>
                      <p
                        className={`font-medium transition ${isActive ? 'text-gray-600 dark:text-gray-300' : 'text-black dark:text-white'}`}
                      >
                        {scene.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scene.startTime}s - {scene.endTime}s
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
