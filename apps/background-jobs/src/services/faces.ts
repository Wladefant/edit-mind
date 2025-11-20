import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import { faceMatcherQueue } from 'src/queue'
import { AddFaceLabelingJobParams } from '@shared/types/faces'
import { KNOWN_FACES_DIR, UNKNOWN_FACES_DIR } from '@shared/constants'

export const getAllUnknownFaces = async () => {
  if (UNKNOWN_FACES_DIR && !existsSync(UNKNOWN_FACES_DIR)) {
    return []
  }

  const files = await fs.readdir(UNKNOWN_FACES_DIR)
  const jsonFiles = files.filter((file) => file.endsWith('.json'))

  const faces = await Promise.all(
    jsonFiles.map(async (file) => {
      try {
        const filePath = path.join(UNKNOWN_FACES_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(content)
      } catch {
        return null
      }
    })
  )

  return faces.filter((face) => face)
}

export const getAllKnownFaces = async () => {
  if (existsSync(KNOWN_FACES_DIR)) {
    const faces = await fs.readFile(KNOWN_FACES_DIR, 'utf-8')
    return JSON.parse(faces)
  }

  return null
}

export const addFaceLabelingJob = async (params: AddFaceLabelingJobParams) => {
  const job = await faceMatcherQueue.add('face-matcher', params, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  })

  return job
}
