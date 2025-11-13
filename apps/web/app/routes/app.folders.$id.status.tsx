import { DashboardLayout } from '~/components/dashboard/DashboardLayout'
import { Sidebar } from '~/components/dashboard/Sidebar'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData, useRevalidator } from 'react-router'
import { prisma } from '~/services/database'
import { JobsGrid } from '~/components/JobsGrid'
import { useEffect } from 'react'

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) throw new Response('Folder not found', { status: 404 })

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      jobs: {
        orderBy: { updatedAt: 'desc' },
        where: {
          OR: [{ status: 'pending' }, { status: 'processing' }],
        },
      },
    },
  })

  if (!folder) throw new Response('Folder not found', { status: 404 })

  return { folder }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.folder) {
    return [{ title: 'Folder not found | Edit Mind' }]
  }

  const folderName = data.folder.path.split('/').pop() || 'Folder'

  return [
    {
      title: `${folderName} Status | Edit Mind`,
    },
  ]
}

export default function FolderStatusPage() {
  const { folder } = useLoaderData<typeof loader>()
  const revalidator = useRevalidator()

  // Revalidate every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (revalidator.state === 'idle') {
        revalidator.revalidate()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [revalidator])
  
  return (
    <DashboardLayout sidebar={<Sidebar />}>
      <main className="w-full px-12 py-16">
        <header className="mb-12">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-2 font-sans">
            {folder.path.split('/').pop()}
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-mono">{folder.path}</p>
        </header>

        <section>
          {folder.jobs.length > 0 ? (
            <>
              <h2 className="text-2xl font-semibold text-black dark:text-white mb-6">
                Active Jobs — {folder.jobs.length} {folder.jobs.length === 1 ? 'job' : 'jobs'}
              </h2>
              <JobsGrid jobs={folder.jobs} />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 dark:bg-white/5 px-12 py-24 w-full">
                <img src="/illustrations/empty-folder.svg" alt="No videos" className="w-full h-56 mx-auto mb-8" />
                <h4 className="text-xl font-semibold text-black dark:text-white mb-3">
                  {' '}
                  No active video indexing jobs in this folder.
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-base mb-8 max-w-sm mx-auto">
                  Video indexing jobs appear here when you upload or process new videos. Check back soon!
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </DashboardLayout>
  )
}
