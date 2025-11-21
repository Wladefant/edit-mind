import { decryptApiKey } from '@shared/services/encryption'
import { Worker, Job } from 'bullmq'
import { connection } from '../queue'
import { ImmichImporterJobData } from '@shared/types/immich'
import { getAllImmichFaces } from '@shared/services/immich'
import { reindexFaces } from '@shared/utils/faces'
import { pythonService } from '@shared/services/pythonService'
import { prisma } from 'src/services/db'

async function processImmichImporterJob(job: Job<ImmichImporterJobData>) {
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: job.data.integrationId },
      select: { immichApiKey: true },
    })
    const apiKey = decryptApiKey(integration.immichApiKey)
    await getAllImmichFaces({ baseUrl: integration.immichBaseUrl, apiKey })
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
