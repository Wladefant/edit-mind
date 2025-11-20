import z from 'zod'
import { unknownFace } from '../schemas'

export type UnknownFace = z.infer<typeof unknownFace>

export interface FaceIndexingProgress {
  progress: number
  elapsed: string
}
export interface KnownFace {
  name: string
  images: string[]
}
export interface AddFaceLabelingJobParams {
  personName: string
  referenceImages: string[]
  unknownFacesDir: string
}

export type FaceIndexProgress = {
  progress: number
  elapsed: string
}

export interface FaceLabelingJobData {
  personName: string
  referenceImages: string[]
  unknownFacesDir: string
}

export interface MatchResult {
  json_file: string
  image_file: string
  confidence: number
  face_id: string
  face_data: {
    video_path: string
    frame_start_time_ms: number
    frame_end_time_ms: number
  }
}
