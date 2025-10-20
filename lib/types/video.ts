import { Scene } from "./scene"

export interface Video {
  source: string
  duration: string | number
  aspect_ratio: string
  camera: string
  category: string
  createdAt: string
  scenes?: Scene[]
  sceneCount?: number
  thumbnailUrl?: string
}
export interface VideoWithScenes extends Video {
  scenes: Scene[]
  sceneCount: number
}
export interface VideoMetadata {
  duration: number
  fps: number
  width: number
  height: number
  totalFrames: number
}

export interface VideoFile {
  path: string
  mtime: Date
}

export interface CameraInfo {
  camera: string
  createdAt: string
}

export interface GeoLocation {
  latitude?: number
  longitude?: number
  altitude?: number
}

export interface FFmpegError extends Error {
  code?: number
  stderr?: string
}

export interface Dimensions {
  width: number
  height: number
}

export interface FFmpegProcessResult {
  code: number
  stderr: string
}