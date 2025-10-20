import z from 'zod'
import { VideoMetadataSummarySchema } from '../conveyor/schemas/app-schema'
import { ShotType, AspectRatio } from '.'

export interface VideoSearchParams {
  action: string
  emotions: string[]
  shot_type: ShotType | null
  aspect_ratio: AspectRatio | null
  duration: number | null
  description: string
  outputFilename: string
  objects: string[]
  camera?: string
  transcriptionQuery?: string
  detectedText?: string
}

export type SearchQuery = {
  faces?: string[]
  emotions?: string[]
  shot_type?: ShotType | null
  aspect_ratio?: AspectRatio | null
  description?: string
  objects?: string[]
  camera?: string
  transcriptionQuery?: string
  detectedText?: string
}

export interface SearchSuggestion {
  text: string
  icon: string
  category: 'people' | 'emotion' | 'scene' | 'action' | 'color'
}

export type VideoMetadataSummary = z.infer<typeof VideoMetadataSummarySchema>

export interface FaceData {
  name: string
  count: number
  thumbnail?: string
}

export interface GenerationResult {
  message: string
  videoPath: string
  fcpxmlPath: string
}

export interface VideoConfig {
  aspectRatio: string
  fps: number
}
