import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { getUser } from '~/services/user.sever'

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard | Edit Mind' }]
}
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)

  const videos = [
    {
      id: 1,
      title: 'Morning Ride – GoPro Footage',
      thumbnail: 'https://images.unsplash.com/photo-1604942177421-df466b7410f6?auto=format&fit=crop&w=900&q=80',
      duration: '12:43',
      addedAt: '2025-10-22',
    },
    {
      id: 2,
      title: 'Product Demo Final Cut',
      thumbnail: 'https://images.unsplash.com/photo-1490971269589-386b2934c495?auto=format&fit=crop&w=900&q=80',
      duration: '3:09',
      addedAt: '2025-10-20',
    },
    {
      id: 3,
      title: 'Podcast Episode 1',
      thumbnail: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
      duration: '27:12',
      addedAt: '2025-10-19',
    },
    {
      id: 4,
      title: 'City Timelapse',
      thumbnail: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=900&q=80',
      duration: '5:04',
      addedAt: '2025-10-17',
    },
    {
      id: 5,
      title: 'Nature Documentary – Forest Life',
      thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
      duration: '18:27',
      addedAt: '2025-10-15',
    },
    {
      id: 6,
      title: 'Interview With Startup Founder',
      thumbnail: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21',
      duration: '42:15',
      addedAt: '2025-10-14',
    },
    {
      id: 7,
      title: 'Mountain Adventure Drone Footage',
      thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80',
      duration: '7:32',
      addedAt: '2025-10-13',
    },
    {
      id: 8,
      title: 'Cinematic B-Roll – Sunset Streets',
      thumbnail: 'https://images.unsplash.com/photo-1586732711713-421a6cc95490?auto=format&fit=crop&w=900&q=80',
      duration: '2:58',
      addedAt: '2025-10-11',
    },
    {
      id: 9,
      title: 'Studio Setup Overview',
      thumbnail: 'https://images.unsplash.com/photo-1682939634610-5187eb7f9619?auto=format&fit=crop&w=900&q=80',
      duration: '9:11',
      addedAt: '2025-10-10',
    },
    {
      id: 10,
      title: 'Client Project Walkthrough',
      thumbnail: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2370',
      duration: '15:49',
      addedAt: '2025-10-09',
    },
    {
      id: 11,
      title: 'Biking Across the Sahara',
      thumbnail: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=80',
      duration: '10:44',
      addedAt: '2025-10-08',
    },
    {
      id: 12,
      title: 'Behind the Scenes – Product Shoot',
      thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80',
      duration: '6:21',
      addedAt: '2025-10-07',
    },
    {
      id: 13,
      title: 'Aerial Footage of the Coastline',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
      duration: '8:55',
      addedAt: '2025-10-06',
    },
    {
      id: 14,
      title: 'Music Video – Chill Lo-fi Vibes',
      thumbnail: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=900&q=80',
      duration: '4:33',
      addedAt: '2025-10-05',
    },
    {
      id: 15,
      title: 'Short Film – Reflections',
      thumbnail: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80',
      duration: '11:02',
      addedAt: '2025-10-04',
    },
    {
      id: 16,
      title: 'Exploring Marrakech Markets',
      thumbnail: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2367',
      duration: '13:56',
      addedAt: '2025-10-02',
    },
    {
      id: 17,
      title: 'Wildlife Compilation – Africa',
      thumbnail: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=900&q=80',
      duration: '20:18',
      addedAt: '2025-09-30',
    },
    {
      id: 18,
      title: 'UX Design Workshop Recording',
      thumbnail: 'https://images.unsplash.com/photo-1660722130895-21f0c850dc12?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2370',
      duration: '55:21',
      addedAt: '2025-09-28',
    },
    {
      id: 19,
      title: 'Night Drone Footage – Downtown Lights',
      thumbnail: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=2370',
      duration: '9:41',
      addedAt: '2025-09-25',
    },
    {
      id: 20,
      title: 'Time-lapse – Morning City Rush',
      thumbnail: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
      duration: '2:36',
      addedAt: '2025-09-22',
    },
  ]

  return { userEmail: user?.email ?? 'demo@user.com', videos }
}

export default function Dashboard() {
  const { userEmail, videos } = useLoaderData<typeof loader>()

  return (
    <DashboardLayout userEmail={userEmail}>
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h2 className="text-5xl font-semibold text-black dark:text-white tracking-tight mb-4">
            Your editor's
            <br />
            second brain
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl">
            Index your video library locally and search with natural language. All processing happens on your device.
          </p>
        </div>

        <section>
          <h3 className="text-xl font-semibold text-black dark:text-white mb-6">Your video:</h3>

          {videos.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No videos indexed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="relative group overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="object-cover w-full h-56 sm:h-64 lg:h-60 xl:h-64 transition-transform duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-100 transition-opacity duration-300" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-[15px] leading-tight truncate">{video.title}</span>
                      <span className="text-xs text-gray-200">
                        {new Date(video.addedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className="bg-white/20 backdrop-blur-sm text-[12px] px-2 py-0.5 rounded-md">
                      {video.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
