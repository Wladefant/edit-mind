import { Link, useLoaderData, useNavigate } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { getAllVideosWithScenes } from '@shared/services/vectorDb';
import { Sidebar } from '~/components/dashboard/Sidebar'

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { videos, allSources } = await getAllVideosWithScenes(limit, offset)
  const total = allSources.length
  return { videos, page, limit, total }
}

export default function Dashboard() {
  const { videos, total, page, limit } = useLoaderData<typeof loader>()
  const navigate = useNavigate()

  const totalPages = Math.ceil(total / limit)

  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="max-w-7xl mx-auto px-8 py-20">
        <div className="mb-20 text-center">
          <h1 className="text-6xl font-semibold text-black dark:text-white tracking-tight mb-5 leading-tight">
            My videos gallery's
            <br />
            second brain.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Organize your video library locally and search with natural language.
            <br />
            All processing happens securely on your device.
          </p>
        </div>

        <section>
          <h3 className="text-2xl font-semibold text-black dark:text-white mb-8">My Videos</h3>

          {videos.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm">No videos indexed yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {videos.map((video) => (
                  <Link
                    to={`/app/videos?source=${video.source}`}
                    key={video.source}
                    className="relative cursor-progress group overflow-hidden rounded-3xl bg-white/10 dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-2xl duration-300"
                  >
                    <div className="w-full h-full">
                      <img
                        src={'/thumbnails/' + video.thumbnailUrl}
                        alt={video.fileName}
                        className="object-cover w-full aspect-video rounded-3xl"
                      />
                    </div>

                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-[15px] leading-tight truncate drop-shadow-sm">
                          {video.fileName}
                        </span>
                        <span className="text-xs text-gray-200">
                          {new Date(video.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span className="bg-white/25 backdrop-blur-md text-[12px] px-2 py-0.5 rounded-md">
                        {Math.round(parseFloat(video.duration.toString()))} sec
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="flex justify-center items-center mt-16 gap-4">
                <button
                  disabled={page === 1}
                  onClick={() => navigate(`?page=${page - 1}`)}
                  className="px-5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-full
                             bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10
                             transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => navigate(`?page=${page + 1}`)}
                  className="px-5 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-full
                             bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10
                             transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
