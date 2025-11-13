import { useEffect, useState } from 'react'
import { useLoaderData } from 'react-router'
import { CustomVideoPlayer } from '~/components/video/CustomVideoPlayer'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { getByVideoSource } from '@shared/services/vectorDb'

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const source = url.searchParams.get('source')

  if (!source) {
    throw new Response('Video not found', { status: 404 })
  }

  const scenes = await getByVideoSource(source)

  if (!scenes || scenes.length === 0) {
    throw new Response('Scenes not found', { status: 404 })
  }

  return { scenes, source }
}

export default function Video() {
  const data = useLoaderData<typeof loader>()
  const [defaultStartTime, setDefaultStartTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [activeScene, setActiveScene] = useState(data.scenes[0])

  useEffect(() => {
    const scene = data.scenes.find(
      (scene) => currentTime >= scene.startTime && currentTime <= scene.endTime
    )
    if (scene) setActiveScene(scene)
  }, [currentTime, data.scenes])

  return (
    <DashboardLayout>
      <main className="max-w-7xl mx-auto px-6 py-16">
        <section>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-6">Your video</h3>
        </section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex max-h-full flex-col gap-4">
            <CustomVideoPlayer
              source={data.source}
              scenes={data.scenes}
              title={data.source}
              defaultStartTime={defaultStartTime}
              onTimeUpdate={setCurrentTime}
            />

            {activeScene && (
              <div className="rounded-xl border border-gray-300 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-6 shadow-sm transition">
                {/* Scene details */}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-4">Scenes</h2>
            <div className="space-y-4">
              {data.scenes.map((scene) => {
                const isActive = scene === activeScene
                return (
                  <div
                    key={scene.id}
                    onClick={() => setDefaultStartTime(scene.startTime)}
                    className={`flex items-center gap-4 p-2 rounded-lg cursor-pointer transition
                    ${isActive
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
                      <p className={`font-medium transition ${isActive ? 'text-gray-600 dark:text-gray-300' : 'text-black dark:text-white'}`}>
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
