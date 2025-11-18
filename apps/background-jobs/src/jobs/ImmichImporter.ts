import { Worker, Job } from 'bullmq'
import { connection } from '../queue'
import { ImmichImporterJobData } from '@shared/types/immich'
import { getAllImmichFaces } from '@shared/services/immich'
import { reindexFaces } from '@shared/utils/faces'
import { pythonService } from '@shared/services/pythonService'

async function processImmichImporterJob(job: Job<ImmichImporterJobData>) {
  try {
    await getAllImmichFaces(job.data.apiKey)
    if (!pythonService.isServiceRunning) await pythonService.start()
    await reindexFaces()
  } catch (error) {
    console.error(error)
  }
}

export const ImmichImporter = new Worker('immich-importer', processImmichImporterJob, {
  connection,
  concurrency: 5,
})

ImmichImporter.on('completed', (job) => {
  console.debug(`Face labeling job ${job.id} completed`)
})

ImmichImporter.on('failed', (job, err) => {
  console.error(`Face labeling job ${job?.id} failed:`, err)
})
