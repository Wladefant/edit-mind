import { Worker, Job } from 'bullmq'
import { promises as fs } from 'fs';
import path from 'path'
import { getByVideoSource, updateMetadata } from '@shared/services/vectorDb'
import type { Scene } from '@shared/types/scene'
import { pythonService } from '@shared/services/pythonService'
import { connection } from '../queue'
import { findMatchingFaces, reindexFaces } from '@shared/utils/faces'
import { FaceLabelingJobData, MatchResult } from '@shared/types/face'
import { FACES_DIR, KNOWN_FACES_FILE, PROCESSED_VIDEOS_DIR } from '@shared/constants'
import { logger } from '@shared/services/logger'
import { safeUpdateKnownFaces, safeUpdateScenesFile } from 'src/utils/locker';


async function processFaceMatcherJob(job: Job<FaceLabelingJobData>) {
  const { personName, referenceImages, unknownFacesDir } = job.data

  logger.info(
    { jobId: job.id, personName, referenceImagesCount: referenceImages.length, unknownFacesDir },
    'Starting face matcher job'
  )
  let matchIndex = 0

  if (!pythonService.isServiceRunning()) {
    logger.info('Python service not running, starting it')
    await pythonService.start()
    logger.info('Python service started successfully')
  }

  await job.updateProgress(1)
  const processedFaces: Array<{ name: string; image_path: string }> = []

  logger.info({ jobId: job.id, personName }, 'Finding matching faces')
  const result = await findMatchingFaces(personName, referenceImages, unknownFacesDir, async (progress) => {
    logger.debug({ progress }, 'Face matching progress')
    const { match } = progress
    if (match) {
      logger.debug({ jobId: job.id, matchIndex, faceId: match.face_id }, 'Processing match')
      const imagePath = await processMatch(match, personName, unknownFacesDir)

      if (imagePath) {
        processedFaces.push({
          name: personName,
          image_path: path.basename(imagePath.toString()),
        })
      }
    }
    matchIndex++
    const progressPercent = progress.progress || 0
    await job.updateProgress(progressPercent)
    logger.debug({ jobId: job.id, progress: progressPercent }, 'Job progress updated')
  })

  logger.info({ jobId: job.id, matchesFound: result.matches.length }, 'Face matching completed')

  try {
    logger.info({ jobId: job.id }, 'All matches processed successfully')

    await reindexFaces(processedFaces)
    logger.info({ jobId: job.id }, 'Face reindexing completed')
  } catch (error) {
    logger.error({ jobId: job.id, error: error instanceof Error ? error.message : error }, 'Error processing matches')
    throw error
  }
}

async function processMatch(match: MatchResult, personName: string, unknownFacesDir: string) {
  const { json_file, image_file, face_id, face_data } = match

  logger.debug(
    {
      faceId: face_id,
      imageFile: image_file,
      videoPath: face_data.video_path,
      timestamp_seconds: face_data.timestamp_seconds,
    },
    'Processing individual match'
  )

  try {
    logger.debug({ videoPath: face_data.video_path }, 'Fetching scenes from vector DB')
    const scenes: Scene[] = await getByVideoSource(face_data.video_path)
    logger.debug({ scenesCount: scenes.length, videoPath: face_data.video_path }, 'Scenes retrieved')

    const faceTimestamp = parseFloat(face_data.timestamp_seconds.toString())

    const modifiedScenes = scenes
      .map((scene) => {
        if (scene.startTime <= faceTimestamp && scene.endTime >= faceTimestamp) {
          scene.faces = scene.faces.map((face) => (face === face_id ? personName : face))
          if (scene.facesData) {
            scene.facesData = scene.facesData?.map((f) => (f.name === face_id ? { ...f, name: personName } : f))
          }
          logger.debug({ sceneId: scene.id, face_id, personName }, 'Updated face ID to person name in scene')
          return scene
        }
        return undefined
      })
      .filter((scene): scene is Scene => scene !== undefined)

    logger.debug({ modifiedScenesCount: modifiedScenes.length }, 'Scenes modified with person name')
    const videoDir = path.join(PROCESSED_VIDEOS_DIR, path.basename(face_data.video_path))

    const scenesPath = path.join(videoDir, 'scenes.json')
    
    // Update vector DB
    for (const scene of modifiedScenes) {
      logger.debug({ sceneId: scene.id }, 'Updating scene metadata')
      await updateMetadata(scene)
    }

    // Update scenes.json file with lock
    await safeUpdateScenesFile(scenesPath, face_id, personName, faceTimestamp)

    logger.info({ modifiedScenesCount: modifiedScenes.length, personName }, 'Scene metadata updated successfully')
    logger.debug(
      {
        faceTimestamp,
        matchingSceneCount: modifiedScenes.length,
        firstMatch: modifiedScenes[0] ? { start: modifiedScenes[0].startTime, end: modifiedScenes[0].endTime } : null,
      },
      'Scenes matched with corrected logic'
    )
    const personDir = path.join(FACES_DIR, personName)

    const dirExists = await fs
      .access(personDir)
      .then(() => true)
      .catch(() => false)

    if (!dirExists) {
      logger.debug({ personDir }, 'Creating person directory')
      await fs.mkdir(personDir, { recursive: true })
      logger.debug({ personDir }, 'Person directory created')
    }

    const oldImagePath = path.join(unknownFacesDir, image_file)
    const newImagePath = path.join(personDir, image_file)

    logger.debug({ from: oldImagePath, to: newImagePath }, 'Moving face image')
    await fs.rename(oldImagePath, newImagePath)
    logger.debug({ newImagePath }, 'Face image moved successfully')

    await safeUpdateKnownFaces(personName, newImagePath)

    logger.debug({ knownFacesFile: KNOWN_FACES_FILE }, 'Known faces file updated')

    const jsonPath = path.join(unknownFacesDir, json_file)
    logger.debug({ jsonPath }, 'Deleting JSON metadata file')
    await fs.unlink(jsonPath)
    logger.debug({ jsonPath }, 'JSON metadata file deleted')

    logger.info({ face_id, personName, imageFile: image_file }, 'Match processed successfully')
    return newImagePath
  } catch (error) {
    logger.error(
      {
        imageFile: image_file,
        faceId: face_id,
        personName,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error processing match'
    )
    throw error
  }
}

export const faceMatcherWorker = new Worker('face-matcher', processFaceMatcherJob, {
  connection,
  concurrency: 1,
})

faceMatcherWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Face labeling job completed')
})

faceMatcherWorker.on('failed', (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      stack: err.stack,
    },
    'Face labeling job failed'
  )
})