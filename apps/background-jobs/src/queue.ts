import { Queue } from 'bullmq'
import { config } from './config.js'
import IORedis from 'ioredis'

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
})
export const videoQueue = new Queue('video-indexing', { connection })
