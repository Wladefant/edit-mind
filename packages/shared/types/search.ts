import z from 'zod'
import { ShotType, AspectRatio } from '.'
import { searchSuggestionSchema, VideoMetadataSummarySchema } from '../schemas'

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

export type SearchSuggestion = z.infer<typeof searchSuggestionSchema>

export type VideoMetadataSummary = z.infer<typeof VideoMetadataSummarySchema>

export interface FaceData {
  name: string
  count: number
  thumbnail?: string
}
export type LoadedFaces = Record<string, string[]>

export interface GenerationResult {
  message: string
  videoPath: string
  fcpxmlPath: string
}

export interface VideoConfig {
  aspectRatio: string
  fps: number
}

export interface SearchMetadata {
  aspectRatio?: AspectRatio
  faces?: string[]
}
