import path from 'path'
import { spawn } from 'child_process'
import { Analysis } from '../types/analysis'

/**
 * Analyzes a video file using a Python script.
 * @param videoFullPath The full path to the video file.
 * @returns A promise that resolves with the analysis results, including category and thumbnail URL.
 */
export async function analyzeVideo(videoPath: string): Promise<{ analysis: Analysis; category: string }> {
  return new Promise((resolve, reject) => {
    const ANALYZE_SERVICE_PATH = path.join(process.cwd(), 'python/analyze.py')

    const pythonProcess = spawn('python', [ANALYZE_SERVICE_PATH, videoPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    let stdout = ''
    let stderr = ''

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      const log = data.toString()
      stderr += log
      if (log.includes('Batch') || log.includes('Known:')) {
        process.stderr.write('.')
      }
    })

    pythonProcess.on('close', (code) => {

      if (code !== 0) {
        reject(new Error(`Python process failed: ${stderr}`))
        return
      }

      try {
        const result = JSON.parse(stdout)
        let category = 'Uncategorized'
        if (result && result.scene_analysis && result.scene_analysis.environment) {
          const scene = result.scene_analysis.environment
          category = scene.charAt(0).toUpperCase() + scene.slice(1)
        }
        resolve({
          analysis: result,
          category,
        })
      } catch (error) {
        reject(new Error(`Failed to parse output: ${error}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(error)
    })
  })
}
