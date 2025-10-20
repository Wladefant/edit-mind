import z from "zod"
import { Scene } from "./scene"
import { videoSchema } from "../conveyor/schemas/app-schema"


export type Video = z.infer<typeof videoSchema>

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