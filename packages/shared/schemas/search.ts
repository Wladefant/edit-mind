import * as z from 'zod'

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable(),
  emotions: z.array(z.string()).default([]),
  shot_type: z.enum(['medium-shot', 'long-shot', 'close-up']).nullable(),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3', '8:7']).nullable().default('16:9'),
  duration: z.number().min(0).nullable(),
  description: z.string(),
  objects: z.array(z.string()).default([]),
  transcriptionQuery: z.string().nullable(),
  faces: z.array(z.string()).optional().default([]),
  semanticQuery: z.string().nullable(),
  locations: z.array(z.string()).default([]),
  camera: z.string().nullable(),
  detectedText: z.string().nullable(),
})
