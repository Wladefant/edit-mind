import { pythonService } from '../services/pythonService'
import { TranscriptionProgress } from '../types/transcription'



type ProgressCallback = (progress: TranscriptionProgress) => void

export async function transcribeAudio(
  videoFilePath: string,
  transcriptionPath: string,
  onProgress?: ProgressCallback
): Promise<{ path: string } | undefined> {
  return new Promise((resolve) => {
    try {
      pythonService.transcribe(
        videoFilePath,
        transcriptionPath,
        (progress) => {
          if (onProgress) onProgress(progress)
        },
        (_result) => {
          if (onProgress) resolve({ path: transcriptionPath })
        },
        (error) => {
          console.error('Video transcription failed:', error)
        }
      )
    } catch (error) {
      console.error('Video transcription failed:', error)
    }
  })
}
