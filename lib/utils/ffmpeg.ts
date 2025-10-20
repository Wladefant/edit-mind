import { spawn, ChildProcess } from 'child_process'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'


export const validateBinaries = (): void => {
  if (!ffmpegStatic) {
    throw new Error('FFmpeg binary not found. Please ensure ffmpeg-static is properly installed.')
  }
  if (!ffprobeStatic?.path) {
    throw new Error('FFprobe binary not found. Please ensure ffprobe-static is properly installed.')
  }
}

export const spawnFFmpeg = (args: string[]): ChildProcess => {
  validateBinaries()
  return spawn(ffmpegStatic!, args, {
    stdio: ['ignore', 'ignore', 'pipe'],
  })}