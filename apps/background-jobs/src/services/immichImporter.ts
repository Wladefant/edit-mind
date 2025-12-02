import { immichImporterQueue } from 'src/queue'

export async function addImmichImporterJob(integrationId: string) {
  const job = await immichImporterQueue.add(
    'immich-importer',
    { integrationId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  return job
}
