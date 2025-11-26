import * as z from 'zod'

export const VideoSearchParamsSchema = z.object({
  action: z.string().nullable(),
  emotions: z.array(z.string()).default([]),
  shot_type: z.enum(['medium-shot', 'long-shot', 'close-up']).nullable(),
  aspect_ratio: z.enum(['16:9', '9:16', '1:1', '4:3', '8:7']).nullable().default('16:9'),
  duration: z.number().positive().nullable(),
  description: z.string().min(1),
  objects: z.array(z.string()).default([]),
  transcriptionQuery: z.string().nullable(),
  faces: z.array(z.string()).optional().default([]),
})
