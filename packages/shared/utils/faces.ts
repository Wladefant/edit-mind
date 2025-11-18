import { pythonService } from '../services/pythonService'
import { FaceIndexProgress } from '../types/faces'

type ProgressCallback = (progress: FaceIndexProgress) => Promise<void>

export function reindexFaces(onProgress?: ProgressCallback): Promise<any> {
  return new Promise((resolve, reject) => {
    pythonService.reindexFaces(
      async (progress) => {
        if (onProgress) {
          try {
            await onProgress(progress)
          } catch (error) {
            console.error('❌ Error in progress callback:', error)
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
  onProgress?: ProgressCallback
): Promise<any> {
  return new Promise((resolve, reject) => {
    pythonService.findMatchingFaces(
      personName,
      referenceImages,
      unknownFacesDir,
      async (progress) => {
        if (onProgress) {
          try {
            await onProgress(progress)
          } catch (error) {
            console.error('❌ Error in progress callback:', error)
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
