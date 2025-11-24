import { chmod } from 'fs/promises'
import { existsSync } from 'fs'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import { spawn, ChildProcess } from 'child_process'
import { logger } from '../services/logger'

const ensureBinaryPermissions = async (binaryPath: string): Promise<void> => {
  try {
    if (existsSync(binaryPath)) {
      await chmod(binaryPath, 0o755)
    }
  } catch (error) {
    logger.warn(`Failed to set permissions for ${binaryPath}:` + error)
  }
}

export const validateBinaries = async (): Promise<void> => {
  if (!ffmpegInstaller.path) {
    throw new Error('FFmpeg binary not found.')
  }
  if (!ffprobeInstaller.path) {
    throw new Error('FFprobe binary not found.')
  }

  // Ensure binaries have execute permissions
  await ensureBinaryPermissions(ffmpegInstaller.path)
  await ensureBinaryPermissions(ffprobeInstaller.path)

  if (!existsSync(ffmpegInstaller.path)) {
    throw new Error(`FFmpeg binary not found at path: ${ffmpegInstaller.path}`)
  }
  if (!existsSync(ffprobeInstaller.path)) {
    throw new Error(`FFprobe binary not found at path: ${ffprobeInstaller.path}`)
  }
}

export const spawnFFmpeg = async (args: string[]): Promise<ChildProcess> => {
  await validateBinaries()
  return spawn(ffmpegInstaller.path, args)
}

export const spawnFFprobe = async (args: string[]): Promise<ChildProcess> => {
  await validateBinaries()
  return spawn(ffprobeInstaller.path, args)
}