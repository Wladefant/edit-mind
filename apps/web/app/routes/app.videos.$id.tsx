import { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router'
import { CustomVideoPlayer } from '~/components/video/CustomVideoPlayer'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'

export async function loader({ params }: { params: { id: string } }) {
  // const videos = await getVideoWithScenes()
  const video = {}

  // Helper function to convert file paths
  // const convertPath = (filePath: string) => {
  //   if (filePath.startsWith('file://')) {
  //     return '/media/' + encodeURIComponent(filePath.replace('file://', ''))
  //   }
  //   return '/media/' + encodeURIComponent(filePath)
  // }

  return {
    video: {
      ...video,
      // source: convertPath(video.source),
      scenes: video.scenes.map((scene) => ({
        ...scene,
        // source: convertPath(scene.source),
        thumbnailUrl: '/thumbnails/' + scene.thumbnailUrl,
      })),
    },
  }
}

export default function Video() {
  const { video } = useLoaderData<typeof loader>()
  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(video.scenes[0])

  useEffect(() => {
    const scene = video.scenes.find((scene) => currentTime >= scene.startTime && currentTime <= scene.endTime)
    if (scene) setActiveScene(scene)

    return () => {}
  }, [currentTime, video.scenes])

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-6">Your video</h3>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col gap-4">
            <CustomVideoPlayer
              source={video.source}
              scenes={video.scenes}
              title="Demo"
              defaultStartTime={defaultStartTime}
              onTimeUpdate={setCurrentTime}
            />
            {activeScene && (
              <div className="rounded-xl border border-gray-300 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-6 shadow-sm transition">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Scene Details</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{activeScene.description}</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Objects</p>
                    <p className="text-gray-600 dark:text-gray-400">{activeScene.objects.join(', ') || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Faces</p>
                    <p className="text-gray-600 dark:text-gray-400">{activeScene.faces.join(', ') || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Shot Type</p>
                    <p className="text-gray-600 dark:text-gray-400">{activeScene.shot_type || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Emotion</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {activeScene.emotions.map((e) => `${e.name}: ${e.emotion}`).join(', ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Location</p>
                    <p className="text-gray-600 dark:text-gray-400">{activeScene.location}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Camera</p>
                    <p className="text-gray-600 dark:text-gray-400">{activeScene.camera}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">Scenes</h2>
            <div className="space-y-4">
              {video.scenes.map((scene) => {
                const isActive = scene === activeScene

                return (
                  <div
                    key={scene.id}
                    onClick={() => setDefaultStartTime(scene.startTime)}
                    className={`flex items-center gap-4 p-2 rounded-lg cursor-pointer transition
          ${
            isActive
              ? 'bg-blue-100 dark:bg-gray-900/40 border border-gray-400 shadow-sm'
              : 'hover:bg-gray-100 dark:hover:bg-gray-900 border border-transparent'
          }
        `}
                  >
                    <img
                      src={scene.thumbnailUrl}
                      className={`w-24 h-16 object-cover rounded-md transition ${
                        isActive ? 'ring-2 ring-gray-400' : ''
                      }`}
                    />
                    <div>
                      <p
                        className={`font-medium transition ${
                          isActive ? 'text-gray-600 dark:text-gray-300' : 'text-black dark:text-white'
                        }`}
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
