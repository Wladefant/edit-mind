import type { Job } from 'bullmq'
import { videoQueue } from 'src/queue'

export async function findJobsByFolderId(folderId: string): Promise<Job[]> {
  const results: Job[] = []

  const states = ['active', 'waiting', 'delayed', 'failed', 'completed'] as const

  for (const state of states) {
    const jobs = await videoQueue.getJobs([state])

    for (const job of jobs) {
      if (job.data?.folderId === folderId) {
        results.push(job)
      }
    }
  }

  return results
}
