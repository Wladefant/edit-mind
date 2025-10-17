import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const MAX_DEPTH = 5

export const THUMBNAILS_DIR = path.resolve('.thumbnails')
export const PROCESSED_VIDEOS_DIR = path.resolve('.results')

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
}

export function generateThumbnail(videoPath: string, thumbnailPath: string, timestamp: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-ss',
      timestamp.toString(),
      '-i',
      videoPath,
      '-vframes',
      '1',
      '-vf',
      'scale=1200:-1',
      '-q:v',
      '4',
      thumbnailPath,
      '-y',
    ])

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
    ffmpeg.stderr.on('data', (data) => console.error(`ffmpeg stderr: ${data}`))
  })
}

export async function findVideoFiles(
  dirPath: string,
  currentDepth: number = 0,
  maxDepth: number = MAX_DEPTH
): Promise<string[]> {
  if (currentDepth > maxDepth) {
    return []
  }

  try {
    const items = await fs.promises.readdir(dirPath)
    const results = await Promise.all(
      items.map(async (item) => {
        const fullPath = path.join(dirPath, item)
        try {
          const stats = await fs.promises.stat(fullPath)

          if (stats.isDirectory()) {
            return findVideoFiles(fullPath, currentDepth + 1, maxDepth)
          } else if (stats.isFile() && /\.(mp4|mov|avi|mkv)$/i.test(item)) {
            return [fullPath]
          }
        } catch {
          console.error(`Warning: Could not access ${fullPath}`)
        }
        return []
      })
    )

    return results.flat()
  } catch (error) {
    console.error(`Warning: Could not read directory ${dirPath}:`, error)
    return []
  }
}

export const getCameraNameAndDate = async (videoFullPath: string): Promise<{ camera: string; createdAt: string }> => {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      videoFullPath,
    ])

    const metadata = JSON.parse(stdout)
    const tags = metadata.format?.tags || {}

    const createdAt = metadata.format?.tags?.creation_time || tags['com.apple.quicktime.creationdate']
    const cameraMake =
      tags['com.apple.quicktime.make'] ||
      tags['make'] ||
      tags['encoder'] || // GoPro often uses this
      ''

    const cameraModel =
      tags['com.apple.quicktime.model'] ||
      tags['model'] ||
      tags['com.android.version'] || // Some Android devices
      ''

    const goProModel = tags['camera_model_name'] || tags['DeviceName'] || tags['device_name'] || ''

    const isGoPro =
      cameraMake.toLowerCase().includes('gopro') ||
      goProModel.toLowerCase().includes('gopro') ||
      tags['encoder']?.toLowerCase().includes('gopro') ||
      videoFullPath.includes('GX')

    let camera = ''

    if (isGoPro) {
      camera = goProModel || cameraMake || cameraModel || 'GoPro'
    } else if (cameraMake && cameraModel) {
      camera = `${cameraMake} ${cameraModel}`.trim()
    } else {
      camera = cameraMake || cameraModel || goProModel || 'N/A'
    }

    return { camera, createdAt }
  } catch (error) {
    console.error('Error getting camera name:', error)
    return { camera: 'N/A', createdAt: 'N/A' }
  }
}

import ffmpeg from 'fluent-ffmpeg'

export function getVideoMetadata(videoFilePath: string): Promise<ffmpeg.FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
      if (err) {
        if (err.message.includes('ENOENT')) {
          console.error('ffmpeg is not installed. Please install ffmpeg and try again.')
          process.exit(1)
        }
        reject(err)
      } else {
        resolve(metadata)
      }
    })
  })
}
