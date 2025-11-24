import { promises as fs } from 'fs'
import path from 'path'
import { existsSync } from 'fs'
import { faceMatcherQueue } from 'src/queue'
import { AddFaceLabelingJobParams } from '@shared/types/face'
import { FACES_DIR, KNOWN_FACES_FILE, UNKNOWN_FACES_DIR } from '@shared/constants'

const FACES_PER_PAGE = 40

export const getAllUnknownFaces = async (page = 1, limit = FACES_PER_PAGE) => {
  if (UNKNOWN_FACES_DIR && !existsSync(UNKNOWN_FACES_DIR)) {
    return {
      faces: [],
      total: 0,
      page,
      totalPages: 0,
      hasMore: false,
    }
  }

  const files = await fs.readdir(UNKNOWN_FACES_DIR)
  const jsonFiles = files.filter((file) => file.endsWith('.json'))

  const total = jsonFiles.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit

  const paginatedFiles = jsonFiles.slice(startIndex, endIndex)

  const faces = await Promise.all(
    paginatedFiles.map(async (file) => {
      try {
        const filePath = path.join(UNKNOWN_FACES_DIR, file)
        const content = await fs.readFile(filePath, 'utf-8')
        return JSON.parse(content)
      } catch {
        return null
      }
    })
  )

  return {
    faces: faces.filter((face) => face),
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  }
}

export const getAllKnownFaces = async () => {
  if (!existsSync(KNOWN_FACES_FILE)) {
    fs.writeFile(KNOWN_FACES_FILE, JSON.stringify({}), 'utf8')
  }
  if (existsSync(KNOWN_FACES_FILE)) {
    const facesData = await fs.readFile(KNOWN_FACES_FILE, 'utf-8')
    const faces = JSON.parse(facesData)

    const cleanedFaces: Record<string, string[]> = {}
    for (const [person, paths] of Object.entries(faces)) {
      cleanedFaces[person] = (paths as string[]).map((path) => path.replace(FACES_DIR, ''))
    }

    return cleanedFaces
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
