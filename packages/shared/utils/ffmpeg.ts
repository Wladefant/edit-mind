import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'

export const validateBinaries = (): void => {
  if (!ffmpegInstaller.path) {
    throw new Error('FFmpeg binary not found.')
  }
  if (!ffprobeInstaller.path) {
    throw new Error('FFprobe binary not found.')
  }
  
  if (!fs.existsSync(ffmpegInstaller.path)) {
    throw new Error(`FFmpeg binary not found at path: ${ffmpegInstaller.path}`)
  }
  if (!fs.existsSync(ffprobeInstaller.path)) {
    throw new Error(`FFprobe binary not found at path: ${ffprobeInstaller.path}`)
  }
}

export const spawnFFmpeg = (args: string[]): ChildProcess => {
  validateBinaries()
  return spawn(ffmpegInstaller.path, args)
}

export const loadFFprobeStatic = async () => {
  return {
    ffmpegPath: ffmpegInstaller.path,
    ffprobePath: ffprobeInstaller.path
  }
}