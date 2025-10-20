import { spawn, ChildProcess } from 'child_process'
import ffprobeStatic from 'ffmpeg-ffprobe-static'
import fs from 'fs'

export const validateBinaries = (): void => {
  if (!ffprobeStatic.ffmpegPath) {
    throw new Error('FFmpeg binary not found. Please ensure ffmpeg-static is properly installed.')
  }
  if (!ffprobeStatic?.ffprobePath) {
    throw new Error('FFprobe binary not found. Please ensure ffprobe-static is properly installed.')
  }
}

export const spawnFFmpeg = (args: string[]): ChildProcess => {
  validateBinaries()

  const ffmpegPath = ffprobeStatic.ffmpegPath!
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at path: ${ffmpegPath}`)
  }

  return spawn(ffmpegPath, args)
}
