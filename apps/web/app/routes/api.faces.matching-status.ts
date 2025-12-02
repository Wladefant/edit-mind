import type { LoaderFunctionArgs } from 'react-router'
import { faceMatcherQueue } from '../../../background-jobs/src/queue'

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const personName = url.searchParams.get('person')

  if (!personName) {
    return Response.json({ error: 'Person name required' }, { status: 400 })
  }

  try {
    const jobs = await faceMatcherQueue.getJobs(['active', 'waiting', 'delayed'])
    const activeJob = jobs.find((job) => job.data.personName === personName)

    if (!activeJob) {
      const completedJobs = await faceMatcherQueue.getJobs(['completed'], 0, 1)
      const recentJob = completedJobs.find((job) => job.data.personName === personName)

      if (recentJob) {
        return Response.json({
          isActive: false,
          progress: 100,
          matchesFound: recentJob.returnvalue?.matchesFound || 0,
          status: 'completed',
        })
      }

      return Response.json({
        isActive: false,
        progress: 0,
        matchesFound: 0,
        status: 'not_found',
      })
    }

    const progress = activeJob.progress
    const state = await activeJob.getState()

    return Response.json({
      isActive: state === 'active' || state === 'waiting',
      progress: typeof progress === 'number' ? progress : 0,
      matchesFound: 0, 
      status: state,
    })
  } catch (error) {
    console.error('Error fetching matching status:', error)
    return Response.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}
