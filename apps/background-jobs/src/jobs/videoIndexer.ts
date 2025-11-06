import { Worker } from 'bullmq';
import { analyzeVideo } from '../services/pythonClient.js';
import { db } from '../services/db.js';
import { config } from '../config.js';
import IORedis from 'ioredis';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

export const videoIndexerWorker = new Worker(
  'video-indexing',
  async job => {
    const { videoPath } = job.data;
    console.log(`Processing video: ${videoPath}`);

    await db.job.updateMany({ where: { videoPath }, data: { status: 'processing' } });
    const result = await analyzeVideo(videoPath);
    await db.job.updateMany({ where: { videoPath }, data: { status: 'completed' } });

    console.log(`✅ Video processed: ${videoPath}`);
    return result;
  },
  { connection }
);

videoIndexerWorker.on('failed', async (job, err) => {
  console.error('❌ Job failed:', job?.data, err);
  if (job?.data?.videoPath) {
    await db.job.updateMany({ where: { videoPath: job.data.videoPath }, data: { status: 'failed' } });
  }
});
