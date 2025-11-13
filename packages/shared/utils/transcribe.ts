import { pythonService } from '../services/pythonService'
import { TranscriptionProgress } from '../types/transcription'

type ProgressCallback = (progress: TranscriptionProgress) => Promise<void>

export function transcribeAudio(
  videoPath: string,
  jsonFilePath: string,
  onProgress?: ProgressCallback
): Promise<any> {
  return new Promise((resolve, reject) => {
    pythonService.transcribe(
      videoPath,
      jsonFilePath,
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