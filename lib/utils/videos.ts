import fs from 'fs'
import path from 'path'
import { ChildProcess } from 'child_process'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ffprobeStatic from 'ffmpeg-ffprobe-static'
import {
  BATCH_THUMBNAIL_QUALITY,
  DEFAULT_FPS,
  MAX_DEPTH,
  SUPPORTED_VIDEO_EXTENSIONS,
  THUMBNAIL_QUALITY,
  THUMBNAIL_SCALE,
  THUMBNAILS_DIR,
} from '@/lib/constants'
import { exiftool } from 'exiftool-vendored'
import { CameraInfo, GeoLocation, VideoFile, VideoMetadata, FFmpegError } from '../types/video'
import { spawnFFmpeg, validateBinaries } from './ffmpeg'
import { validateFile } from './file'
import ffmpeg from 'fluent-ffmpeg'

const execFileAsync = promisify(execFile)

const initializeThumbnailsDir = (): void => {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true })
  }
}

initializeThumbnailsDir()

const handleFFmpegProcess = (process: ChildProcess, operationName: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let errorOutput = ''

    process.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const error: FFmpegError = new Error(
          `FFmpeg ${operationName} failed with code ${code}: ${errorOutput.trim() || 'Unknown error'}`
        )
        error.code = code ?? undefined
        error.stderr = errorOutput
        reject(error)
      }
    })

    process.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg for ${operationName}: ${err.message}`))
    })
  })
}

export async function generateThumbnail(videoPath: string, thumbnailPath: string, timestamp: number): Promise<void> {
  await validateFile(videoPath)

  const args = [
    '-ss',
    timestamp.toString(),
    '-i',
    videoPath,
    '-vframes',
    '1',
    '-vf',
    `scale=${THUMBNAIL_SCALE}`,
    '-q:v',
    THUMBNAIL_QUALITY,
    thumbnailPath,
    '-y',
    '-loglevel',
    'error',
  ]

  const ffmpegProcess = spawnFFmpeg(args)
  return handleFFmpegProcess(ffmpegProcess, 'thumbnail generation')
}

export async function generateAllThumbnails(
  videoPath: string,
  timestamps: number[],
  outputPaths: string[]
): Promise<void> {
  if (timestamps.length === 0) {
    return
  }

  if (timestamps.length !== outputPaths.length) {
    throw new Error(`Timestamps and output paths length mismatch: ${timestamps.length} vs ${outputPaths.length}`)
  }

  await validateFile(videoPath)

  const filterComplex = timestamps
    .map(
      (ts, idx) =>
    `[0:v]select='between(t,${ts},${ts+0.1})',setpts=PTS-STARTPTS,scale=${THUMBNAIL_SCALE}:flags=fast_bilinear[v${idx}]`
    )
    .join(';')

  const args = [
    '-i',
    videoPath,
    '-filter_complex',
    filterComplex,
    '-q:v',
    BATCH_THUMBNAIL_QUALITY,
    '-loglevel',
    'error',
  ]

  timestamps.forEach((_, idx) => {
    args.push('-map', `[v${idx}]`, '-frames:v', '1', outputPaths[idx])
  })

  args.push('-y')

  const ffmpegProcess = spawnFFmpeg(args)
  return handleFFmpegProcess(ffmpegProcess, 'batch thumbnail generation')
}

export async function findVideoFiles(
  dirPath: string,
  currentDepth: number = 0,
  maxDepth: number = MAX_DEPTH
): Promise<VideoFile[]> {
  if (currentDepth > maxDepth) {
    return []
  }

  try {
    const items = await fs.promises.readdir(dirPath)
    const results: VideoFile[][] = []
    for (const item of items) {
      const fullPath = path.join(dirPath, item)

      try {
        const stats = await fs.promises.stat(fullPath)

        if (stats.isDirectory()) {
          results.push(await findVideoFiles(fullPath, currentDepth + 1, maxDepth))
        } else if (stats.isFile() && SUPPORTED_VIDEO_EXTENSIONS.test(item)) {
          results.push([{ path: fullPath, mtime: stats.mtime }])
        }
      } catch (error) {
        console.warn(
          `Warning: Could not access ${fullPath}:`,
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    }

    return results.flat().sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error')
    return []
  }
}

const extractCameraInfo = (tags: Record<string, any>, videoPath: string): string => {
  const cameraMake = tags['com.apple.quicktime.make'] || tags['make'] || tags['encoder'] || ''
  const cameraModel = tags['com.apple.quicktime.model'] || tags['model'] || tags['com.android.version'] || ''
  const goProModel = tags['camera_model_name'] || tags['DeviceName'] || tags['device_name'] || ''

  const isGoPro =
    cameraMake.toLowerCase().includes('gopro') ||
    goProModel.toLowerCase().includes('gopro') ||
    tags['encoder']?.toLowerCase().includes('gopro') ||
    videoPath.includes('GX')

  if (isGoPro) {
    return goProModel || cameraMake || cameraModel || 'GoPro'
  }

  if (cameraMake && cameraModel) {
    return `${cameraMake} ${cameraModel}`.trim()
  }

  return cameraMake || cameraModel || goProModel || 'Unknown'
}

export async function getCameraNameAndDate(videoFullPath: string): Promise<CameraInfo> {
  try {
    await validateFile(videoFullPath)
    validateBinaries()

    const { stdout } = await execFileAsync(ffprobeStatic.ffprobePath!, [
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

    const createdAt = tags.creation_time || tags['com.apple.quicktime.creationdate'] || 'Unknown'

    const camera = extractCameraInfo(tags, videoFullPath)

    return { camera, createdAt }
  } catch (error) {
    console.error('Error extracting camera metadata:', error instanceof Error ? error.message : 'Unknown error')
    return { camera: 'Unknown', createdAt: 'Unknown' }
  }
}

const parseFPS = (frameRate: string | undefined): number => {
  if (!frameRate) return DEFAULT_FPS

  try {
    // Handle fraction format (e.g., "30000/1001")
    if (frameRate.includes('/')) {
      const [numerator, denominator] = frameRate.split('/').map(Number)
      return denominator ? numerator / denominator : DEFAULT_FPS
    }
    return parseFloat(frameRate) || DEFAULT_FPS
  } catch {
    return DEFAULT_FPS
  }
}

export async function getVideoMetadata(videoFilePath: string): Promise<VideoMetadata> {
  await validateFile(videoFilePath)
  validateBinaries()

  return new Promise((resolve, reject) => {
    ffmpeg.setFfprobePath(ffprobeStatic.ffprobePath!)

    ffmpeg.ffprobe(videoFilePath, (err, metadata) => {
      if (err) {
        const errorMsg = err.message.includes('ENOENT')
          ? 'FFprobe binary not found or not executable'
          : `FFprobe error: ${err.message}`
        reject(new Error(errorMsg))
        return
      }

      try {
        const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
        if (!videoStream) {
          reject(new Error('No video stream found in file'))
          return
        }

        const duration = metadata.format.duration || 0
        const fps = parseFPS(videoStream.r_frame_rate)
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
        reject(new Error(`Failed to parse video metadata: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    })
  })
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0s'
  }

  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}m ${secs}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

const parseCoordinate = (value: number | string | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined

  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function getLocationFromVideo(videoFullPath: string): Promise<GeoLocation> {
  try {
    await validateFile(videoFullPath)

    const tags = await exiftool.read(videoFullPath)

    const latitude = parseCoordinate(tags.GPSLatitude)
    const longitude = parseCoordinate(tags.GPSLongitude)
    const altitude = parseCoordinate(tags.GPSAltitude)

    if (latitude === undefined && longitude === undefined && altitude === undefined) {
      console.warn(`No GPS data found in video: ${videoFullPath}`)
    }

    return { latitude, longitude, altitude }
  } catch (error) {
    console.error('Error extracting GPS data:', error instanceof Error ? error.message : 'Unknown error')
    return {
      latitude: undefined,
      longitude: undefined,
      altitude: undefined,
    }
  }
}
