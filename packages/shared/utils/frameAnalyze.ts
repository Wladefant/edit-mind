import { Analysis, AnalysisProgress } from '../types/analysis'
import { pythonService } from '../services/pythonService'

/**
 * Analyzes a video file using the persistent Python analysis service.
 * @param videoPath The full path to the video file.
 * @param onProgress Callback for progress updates.
 * @param onResult Callback for when the analysis is complete.
 * @param onError Callback for any errors that occur.
 */
export function analyzeVideo(
  videoPath: string,
  onProgress: (progress: AnalysisProgress) => void,
  onResult: (result: { analysis: Analysis; category: string }) => void,
  onError: (error: Error) => void
): void {
  try {
    pythonService.analyzeVideo(
      videoPath,
      (progress) => {
        onProgress(progress)
      },
      (result) => {
        let category = 'Uncategorized'
        if (result?.scene_analysis?.environment) {
          const env = result.scene_analysis.environment
          category = env.charAt(0).toUpperCase() + env.slice(1).replace(/_/g, ' ')
        }
        onResult({ analysis: result, category })
      },
      (error) => {
        console.error('Video analysis failed:', error)
        onError(error)
      }
    )
  } catch (error) {
    console.error('Video analysis failed:', error)
    onError(error as Error)
  }
}
