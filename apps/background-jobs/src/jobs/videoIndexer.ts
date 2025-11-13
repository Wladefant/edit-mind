import { Worker } from 'bullmq'
import { prisma } from '../services/db'
import { connection } from '../queue'
import path from 'path'
import { existsSync, mkdirSync, promises as fs } from 'fs'
import { PROCESSED_VIDEOS_DIR } from '@shared/constants'
import { Scene } from '@shared/types/scene'
import { Analysis } from '@shared/types/analysis'
import { generateThumbnail } from '@shared/utils/videos'
import { createScenes } from '@shared/utils/scenes'
import { embedScenes } from '@shared/utils/embed'
import { analyzeVideo } from '@shared/utils/frameAnalyze'
import { transcribeAudio } from '@shared/utils/transcribe'
import { pythonService } from '@shared/services/pythonService'
import { JobStatus, JobStage } from '@prisma/client'

export const videoIndexerWorker = new Worker(
  'video-indexing',
  async (job) => {
    const { videoPath, jobId } = job.data
    const video = videoPath
    const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '/.thumbnails'

    if (!pythonService.isServiceRunning()) {
      await pythonService.start()
    }

    // Ensure directories exist
    if (!existsSync(PROCESSED_VIDEOS_DIR)) mkdirSync(PROCESSED_VIDEOS_DIR)
    if (!existsSync(THUMBNAILS_DIR)) mkdirSync(THUMBNAILS_DIR)
    const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(video))
    if (!existsSync(videoDir)) mkdirSync(videoDir)

    const transcriptionPath = path.join(videoDir, 'transcription.json')
    const analysisPath = path.join(videoDir, 'analysis.json')
    const scenesPath = path.join(videoDir, 'scenes.json')

    const fileStats = await fs.stat(videoPath)
    try {
      await prisma.job.updateMany({
        where: { id: jobId },
        data: {
          status: JobStatus.processing,
          stage: JobStage.starting,
          overallProgress: 0,
          progress: 0,
          updatedAt: new Date(),
          fileSize: fileStats.size,
        },
      })
      await job.updateProgress(0)

      // Step 0: Thumbnail (0-10%)
      const thumbnailPath = path.join(THUMBNAILS_DIR, `${path.basename(video)}.jpg`)
      console.debug(`🖼 Generating thumbnail for: ${video}`)
      try {
        await generateThumbnail(video, thumbnailPath, 1)
        await prisma.job.updateMany({
          where: { id: jobId },
          data: { thumbnailPath: path.basename(thumbnailPath), updatedAt: new Date() },
        })
      } catch {
        console.error('Error generating a video thumbnail for ' + video)
      }

      await job.updateProgress(10)
      await prisma.job.updateMany({
        where: { id: jobId },
        data: {
          stage: JobStage.transcribing,
          overallProgress: 80,
          updatedAt: new Date(),
        },
      })
      // Step 1: Transcription (10-40%)
      if (!existsSync(transcriptionPath)) {
        console.debug(`🗣 Transcribing audio for: ${video}`)
        await transcribeAudio(video, transcriptionPath, async ({ progress }) => {
          const overallProgress = 10 + progress * 0.3 // 10-40%
          await job.updateProgress(overallProgress)
          await prisma.job.updateMany({
            where: { id: jobId },
            data: {
              stage: JobStage.transcribing,
              progress: Math.round(progress),
              overallProgress: Math.round(overallProgress),
              updatedAt: new Date(),
            },
          })
        })
      }
      await job.updateProgress(40)
      await prisma.job.updateMany({
        where: { id: jobId },
        data: {
          stage: JobStage.frame_analysis,
          overallProgress: Math.round(40),
          updatedAt: new Date(),
        },
      })
      // Step 2: Frame Analysis (40-70%)
      let analysis: Analysis, category: string
      if (!existsSync(analysisPath)) {
        console.debug(`🧠 Starting frame analysis for: ${video}`)
        const result = await analyzeVideo(video, async ({ progress, frames_analyzed, total_frames }) => {
          const overallProgress = 40 + progress * 0.3 // 40-70%
          await job.updateProgress(overallProgress)
          await prisma.job.updateMany({
            where: { id: jobId },
            data: {
              stage: JobStage.frame_analysis,
              progress: Math.round(progress),
              overallProgress: Math.round(overallProgress),
              updatedAt: new Date(),
            },
          })
          if (progress % 10 === 0) {
            console.debug(`📊 Analyzing frames: ${frames_analyzed}/${total_frames} (${progress.toFixed(1)}%)`)
          }
        })

        analysis = result.analysis
        category = result.category
        await fs.writeFile(analysisPath, JSON.stringify({ analysis, category }, null, 2))
      } else {
        const data = await fs.readFile(analysisPath, 'utf-8').then(JSON.parse)
        analysis = data.analysis
        category = data.category
      }
      await job.updateProgress(70)
      await prisma.job.updateMany({
        where: { id: jobId },
        data: {
          stage: JobStage.creating_scenes,
          overallProgress: 70,
          updatedAt: new Date(),
        },
      })
      // Step 3: Scene Creation (70-80%)
      let scenes: Scene[]
      if (!existsSync(scenesPath)) {
        const transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)
        scenes = await createScenes(analysis, transcriptionData, video)
        await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
      } else {
        scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)
      }
      await prisma.job.updateMany({
        where: { id: jobId },
        data: { stage: JobStage.creating_scenes, updatedAt: new Date() },
      })
      await job.updateProgress(80)
      await prisma.job.updateMany({
        where: { id: jobId },
        data: {
          stage: JobStage.embedding,
          overallProgress: 80,
          updatedAt: new Date(),
        },
      })
      // Step 4: Scene Embedding (80-100%)
      await embedScenes(scenes, video, category)
      await prisma.job.updateMany({ where: { id: jobId }, data: { stage: JobStage.embedding, updatedAt: new Date() } })
      await job.updateProgress(100)

      // Mark job done
      await prisma.job.updateMany({
        where: { id: jobId },
        data: { status: JobStatus.done, overallProgress: 100, progress: 100, updatedAt: new Date() },
      })

      console.debug(`🎉 Video processing completed successfully: ${video}`)
      return { video }
    } catch (error) {
      console.error('❌ Error processing video:', video, error)
      await prisma.job.updateMany({ where: { id: jobId }, data: { status: JobStatus.error, updatedAt: new Date() } })
      await job.updateProgress(0)
      throw error
    }
  },
  {
    connection,
    concurrency: 1,
    lockDuration: 15 * 60 * 1000,
    stalledInterval: 5 * 60 * 1000,
    maxStalledCount: 2,
  }
)

videoIndexerWorker.on('failed', async (job, err) => {
  console.error('❌ Job failed:', job?.data, err)
  if (job?.data?.jobId) {
    await prisma.job.updateMany({
      where: { videoPath: job.data.jobId },
      data: { status: JobStatus.error, updatedAt: new Date() },
    })
  }
})
