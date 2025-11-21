import { Worker, Job } from 'bullmq'
import { promises as fs } from 'fs'
import path from 'path'
import { getByVideoSource, updateMetadata } from '@shared/services/vectorDb'
import type { Scene } from '@shared/types/scene'
import { pythonService } from '@shared/services/pythonService'
import { connection } from '../queue'
import { findMatchingFaces, reindexFaces } from '@shared/utils/faces'
import { FaceLabelingJobData, MatchResult } from '@shared/types/face'

const FACES_DIR = '.faces'

async function processFaceMatcherJob(job: Job<FaceLabelingJobData>) {
  const { personName, referenceImages, unknownFacesDir } = job.data

  if (!pythonService.isServiceRunning()) await pythonService.start()
  await job.updateProgress(0)

  const result = await findMatchingFaces(
    personName,
    referenceImages.map((image) => image.replace('web', 'background-jobs')),
    unknownFacesDir,
    async (progress: any) => {
      const progressPercent = progress.progress || 0
      await job.updateProgress(progressPercent)
    }
  )
  try {
    for (const match of result.matches) {
      await processMatch(match, personName, unknownFacesDir)
    }

    await job.updateProgress(100)
  } catch (error) {
    console.error('Error processing matches:', error)
  }
  await reindexFaces()
}

async function processMatch(match: MatchResult, personName: string, unknownFacesDir: string) {
  const { json_file, image_file, face_id, face_data } = match

  try {
    const scenes: Scene[] = await getByVideoSource(face_data.video_path)
    const modifiedScenes = scenes
      .map((scene) => {
        if (
          scene.startTime >= face_data.frame_start_time_ms / 1000 &&
          scene.endTime <= face_data.frame_end_time_ms / 1000
        ) {
          if (scene.faces.includes(face_id)) {
            scene.faces = scene.faces.map((face) => (face === face_id ? personName : face))
            return scene
          }
        }
        return undefined
      })
      .filter((scene): scene is Scene => scene !== undefined)

    for (const scene of modifiedScenes) {
      await updateMetadata(scene)
    }

    const facesDir = path.join(process.cwd(), FACES_DIR)
    const personDir = path.join(facesDir, personName)

    if (
      !(await fs
        .access(personDir)
        .then(() => true)
        .catch(() => false))
    ) {
      await fs.mkdir(personDir, { recursive: true })
    }

    const oldImagePath = path.join(unknownFacesDir, image_file)
    const newImagePath = path.join(personDir, image_file)

    await fs.rename(oldImagePath, newImagePath)

    const facesJsonPath = path.join(process.cwd(), '.faces.json')
    let faces: Record<string, string[]> = {}

    try {
      const content = await fs.readFile(facesJsonPath, 'utf-8')
      faces = JSON.parse(content)
    } catch {
      // File doesn't exist yet
    }

    if (!faces[personName]) {
      faces[personName] = []
    }

    const relativePath = path.join(path.basename(FACES_DIR), personName, image_file)
    faces[personName].push(relativePath)

    await fs.writeFile(facesJsonPath, JSON.stringify(faces, null, 2))

    const jsonPath = path.join(unknownFacesDir, json_file)
    await fs.unlink(jsonPath)
  } catch (error) {
    console.error(`Error processing match ${image_file}:`, error)
    throw error
  }
}

export const faceMatcherWorker = new Worker('face-matcher', processFaceMatcherJob, {
  connection,
  concurrency: 5,
})

faceMatcherWorker.on('completed', (job) => {
  console.debug(`Face labeling job ${job.id} completed`)
})

faceMatcherWorker.on('failed', (job, err) => {
  console.error(`Face labeling job ${job?.id} failed:`, err)
})
