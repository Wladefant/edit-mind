import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ffmpeg from 'fluent-ffmpeg'

const execFileAsync = promisify(execFile)

import { MAX_DEPTH, THUMBNAILS_DIR } from '@/lib/constants';

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
      '-loglevel',
      'error',
    ])

    ffmpeg.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
    ffmpeg.stderr.on('data', (data) => console.error(`ffmpeg stderr: ${data}`))
  })
}

export function generateAllThumbnails(videoPath: string, timestamps: number[], outputPaths: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (timestamps.length === 0) {
      resolve()
      return
    }

    if (timestamps.length !== outputPaths.length) {
      reject(new Error('Timestamps and output paths must have the same length'))
      return
    }

    // Create filter_complex for precise frame extraction
    const filterComplex = timestamps
      .map((ts, idx) => {
        // Extract frame at exact timestamp and scale it
        return `[0:v]trim=start=${ts}:duration=0.1,setpts=PTS-STARTPTS,scale=1200:-1:flags=fast_bilinear[v${idx}]`
      })
      .join(';')

    const args = ['-i', videoPath, '-filter_complex', filterComplex, '-q:v', '5', '-loglevel', 'error']

    timestamps.forEach((_, idx) => {
      args.push('-map', `[v${idx}]`, '-frames:v', '1', outputPaths[idx])
    })

    args.push('-y')

    const ffmpegProcess = spawn('ffmpeg', args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    })

    let errorOutput = ''

    ffmpegProcess.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg batch thumbnails failed (code ${code}): ${errorOutput}`))
      }
    })

    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`))
    })
  })
}
export async function findVideoFiles(
  dirPath: string,
  currentDepth: number = 0,
  maxDepth: number = MAX_DEPTH
): Promise<{ path: string; mtime: Date }[]> {
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
            return await findVideoFiles(fullPath, currentDepth + 1, maxDepth)
          } else if (stats.isFile() && /\.(mp4|mov|avi|mkv)$/i.test(item)) {
            return [{ path: fullPath, mtime: stats.mtime }]
          }
        } catch {
          console.warn(`Warning: Could not access ${fullPath}`)
        }
        return []
      })
    )

    const flatResults = results.flat() as { path: string; mtime: Date }[]

    return flatResults.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
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

export interface VideoMetadata {
  duration: number // in seconds
  fps: number
  width: number
  height: number
  totalFrames: number
}

/**
 * Get video metadata using ffprobe
 */
export function getVideoMetadata(videoFilePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
      if (err) {
        if (err.message.includes('ENOENT')) {
          console.error('ffmpeg is not installed. Please install ffmpeg and try again.')
          reject(new Error('ffmpeg not installed'))
        } else {
          reject(err)
        }
        return
      }

      try {
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
        if (!videoStream) {
          reject(new Error('No video stream found'))
          return
        }

        const duration = metadata.format.duration || 0
        const fps = videoStream.r_frame_rate
          ? eval(videoStream.r_frame_rate) // e.g., "30000/1001" -> 29.97
          : 30
        const width = videoStream.width || 0
        const height = videoStream.height || 0
        const totalFrames = Math.floor(duration * fps)

        resolve({
          duration,
          fps,
          width,
          height,
          totalFrames,
        })
      } catch (error) {
        reject(new Error(`Failed to parse video metadata: ${error}`))
      }
    })
  })
}

/**
 * Format video duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(0)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

export const getLocationFromVideo = async (
  videoFullPath: string
): Promise<{ latitude?: number; longitude?: number; altitude?: number }> => {
  return new Promise((resolve, reject) => {
    try {
      const exifProcess = spawn('exiftool', [
        '-ee',
        '-GPSLatitude',
        '-GPSLongitude',
        '-GPSAltitude',
        '-n', 
        '-json',
        videoFullPath,
      ])

      let stdout = ''
      let stderr = ''

      exifProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      exifProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      exifProcess.on('close', (code) => {
        if (code === 0 && stdout) {
          try {
            const data = JSON.parse(stdout)[0]
            resolve({
              latitude: data.GPSLatitude,
              longitude: data.GPSLongitude,
              altitude: data.GPSAltitude,
            })
          } catch (parseError) {
            console.error('Failed to parse exiftool output:', parseError)
            resolve({
              latitude: undefined,
              longitude: undefined,
              altitude: undefined,
            })
          }
        } else {
          console.error('Exiftool error:', stderr || 'Unknown error')
          resolve({
            latitude: undefined,
            longitude: undefined,
            altitude: undefined,
          })
        }
      })

      exifProcess.on('error', (err) => {
        console.error('Process error:', err)
        reject(new Error(`Failed to spawn exiftool: ${err.message}`))
      })
    } catch (error) {
      console.error('Unexpected error:', error)
      reject(error)
    }
  })
}
