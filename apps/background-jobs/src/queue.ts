import { Queue } from 'bullmq'
import { config } from './config'
import IORedis from 'ioredis'

export const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
})

export const videoQueue = new Queue('video-indexing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})
