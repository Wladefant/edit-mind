import { Link, useLoaderData, useNavigate } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { getAllVideosWithScenes } from '@shared/services/vectorDb'
import { FilterSidebar } from '~/components/videos/FilterSidebar'
import { useState } from 'react'

export const meta: MetaFunction = () => {
  return [{ title: 'Dashboard | Edit Mind' }]
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { videos, allSources, filters } = await getAllVideosWithScenes(limit, offset)
  const total = allSources.length
  return { videos, page, limit, total, filters }
}

export default function Dashboard() {
  const { videos, total, page, limit, filters } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({})

  const totalPages = Math.ceil(total / limit)

  return (
    <DashboardLayout
      sidebar={
        <FilterSidebar
          filters={filters}
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarOpen}
          setIsCollapsed={setIsSidebarOpen}
        />
      }
    >
      <main className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center">
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

        <section className="mt-12">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 dark:bg-white/5 p-12">
                <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">No videos indexed yet</h4>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
                  Start by adding your video folders in settings. We’ll automatically scan and index your videos
                  locally.
                </p>
                <Link
                  to="/app/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-full 
                  bg-black text-white dark:bg-white dark:text-black 
                  hover:scale-[1.03] hover:shadow-lg transition-all duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add folders to start
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-semibold text-black dark:text-white">My Videos</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {videos.map((video) => (
                  <Link
                    to={`/app/videos?source=/${video.source}`}
                    key={video.source}
                    className="relative cursor-pointer group overflow-hidden rounded-3xl bg-white/10 dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-sm transition-all hover:scale-[1.02] hover:shadow-2xl duration-300"
                  >
                    <div className="w-full h-full">
                      <img
                        src={'/thumbnails/' + video.thumbnailUrl}
                        alt={video.fileName}
                        className={`object-cover w-auto h-full  ${video.aspect_ratio === '16:9' ? 'aspect-video' : 'aspect-9/16'} rounded-3xl`}
                      />
                    </div>

                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent opacity-100 pointer-events-none" />

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-[15px] leading-tight truncate drop-shadow-sm">
                          {video.fileName}
                        </span>
                        <span className="text-base text-gray-200">
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
