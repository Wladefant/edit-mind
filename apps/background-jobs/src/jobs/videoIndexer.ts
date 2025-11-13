import { Worker, Job } from 'bullmq'
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

async function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

async function updateJob(jobId: string, data: Partial<{ stage: JobStage; progress: number; overallProgress: number; status: JobStatus; thumbnailPath?: string; fileSize?: number }>) {
  await prisma.job.updateMany({
    where: { id: jobId },
    data: { ...data, updatedAt: new Date() },
  })
}

async function processVideo(job: Job<{ videoPath: string; jobId: string }>) {
  const { videoPath, jobId } = job.data
  const THUMBNAILS_DIR = process.env.THUMBNAILS_PATH || '/.thumbnails'
  const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(videoPath))
  const transcriptionPath = path.join(videoDir, 'transcription.json')
  const analysisPath = path.join(videoDir, 'analysis.json')
  const scenesPath = path.join(videoDir, 'scenes.json')

  // Start Python service if not running
  if (!pythonService.isServiceRunning()) await pythonService.start()

  // Ensure directories
  await ensureDir(PROCESSED_VIDEOS_DIR)
  await ensureDir(THUMBNAILS_DIR)
  await ensureDir(videoDir)

  const fileStats = await fs.stat(videoPath)

  // Initial job update
  await updateJob(jobId, {
    status: JobStatus.processing,
    stage: JobStage.starting,
    overallProgress: 0,
    progress: 0,
    fileSize: fileStats.size,
  })
  await job.updateProgress(0)

  try {
    // Step 0: Thumbnail (0-10%)
    const thumbnailPath = path.join(THUMBNAILS_DIR, `${path.basename(videoPath)}.jpg`)
    try { await generateThumbnail(videoPath, thumbnailPath, 1) } catch (e) { console.error('Thumbnail error:', e) }
    await updateJob(jobId, { thumbnailPath: path.basename(thumbnailPath) })
    await job.updateProgress(10)

    // Step 1: Transcription (10-40%)
    await updateJob(jobId, { stage: JobStage.transcribing, overallProgress: 10 })
    if (!existsSync(transcriptionPath)) {
      await transcribeAudio(videoPath, transcriptionPath, async ({ progress }) => {
        const overallProgress = 10 + progress * 0.3
        await job.updateProgress(overallProgress)
        await updateJob(jobId, {
          stage: JobStage.transcribing,
          progress: Math.round(progress),
          overallProgress: Math.round(overallProgress),
        })
      })
    }
    await job.updateProgress(40)
    await updateJob(jobId, { stage: JobStage.frame_analysis, overallProgress: 40 })

    // Step 2: Frame Analysis (40-70%)
    let analysis: Analysis, category: string
    if (!existsSync(analysisPath)) {
      const result = await analyzeVideo(videoPath, async ({ progress, frames_analyzed, total_frames }) => {
        const overallProgress = 40 + progress * 0.3
        await job.updateProgress(overallProgress)
        await updateJob(jobId, {
          stage: JobStage.frame_analysis,
          progress: Math.round(progress),
          overallProgress: Math.round(overallProgress),
        })
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
    await updateJob(jobId, { stage: JobStage.creating_scenes, overallProgress: 70 })

    // Step 3: Scene Creation (70-80%)
    let scenes: Scene[]
    if (!existsSync(scenesPath)) {
      const transcriptionData = await fs.readFile(transcriptionPath, 'utf-8').then(JSON.parse)
      scenes = await createScenes(analysis, transcriptionData, videoPath)
      await fs.writeFile(scenesPath, JSON.stringify(scenes, null, 2))
    } else {
      scenes = await fs.readFile(scenesPath, 'utf-8').then(JSON.parse)
    }
    await job.updateProgress(80)
    await updateJob(jobId, { stage: JobStage.embedding, overallProgress: 80 })

    // Step 4: Scene Embedding (80-100%)
    await embedScenes(scenes, videoPath, category)
    await job.updateProgress(100)
    await updateJob(jobId, { stage: JobStage.embedding, status: JobStatus.done, overallProgress: 100, progress: 100 })

    return { video: videoPath }

  } catch (error) {
    console.error('❌ Error processing video:', videoPath, error)
    await updateJob(jobId, { status: JobStatus.error })
    await job.updateProgress(0)
    throw error
  }
}

export const videoIndexerWorker = new Worker('video-indexing', processVideo, {
  connection,
  concurrency: 1,
  lockDuration: 15 * 60 * 1000,
  stalledInterval: 5 * 60 * 1000,
  maxStalledCount: 2,
})

videoIndexerWorker.on('failed', async (job, err) => {
  console.error('❌ Job failed:', job?.data, err)
  if (job?.data?.jobId) await updateJob(job.data.jobId, { status: JobStatus.error })
})
