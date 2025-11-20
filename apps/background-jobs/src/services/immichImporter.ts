import { immichImporterQueue } from 'src/queue'

export async function addImmichImporterJob(apiKey: string) {
  const job = await immichImporterQueue.add(
    'immich-importer',
    { apiKey },
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
