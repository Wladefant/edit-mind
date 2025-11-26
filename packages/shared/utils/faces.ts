import { logger } from '../services/logger'
import { pythonService } from '../services/pythonService'
import { FaceIndexProgress, FaceMatchingProgress, FindMatchingFacesResponse } from '../types/face'

type ProgressCallback = (progress: FaceIndexProgress) => Promise<void>

export function reindexFaces(
  specificFaces: { name: string; image_path: string }[],
  jobId: string,
  onProgress?: ProgressCallback
): Promise<void> {
  return new Promise((resolve, reject) => {
    pythonService.reindexFaces(
      specificFaces,
      jobId,
      async (progress) => {
        if (onProgress) {
          try {
            await onProgress(progress)
          } catch (error) {
            logger.error('❌ Error in progress callback:' + error)
          }
        }
      },
      (result) => {
        resolve(result)
      },
      (error) => {
        reject(error)
      }
    )
  })
}
export function findMatchingFaces(
  personName: string,
  referenceImages: string[],
  unknownFacesDir: string,
  onProgress?: (progress: FaceMatchingProgress) => void
): Promise<FindMatchingFacesResponse> {
  return new Promise((resolve, reject) => {
    pythonService.findMatchingFaces(
      personName,
      referenceImages,
      unknownFacesDir,
      (progress) => {
        if (onProgress) {
          onProgress(progress)
        }
      },
      (result) => {
        resolve(result)
      },
      (error) => {
        reject(error)
      }
    )
  })
}
