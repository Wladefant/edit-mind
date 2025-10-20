import { z } from 'zod'

export const progressIpcSchema = {
  'indexing-progress': {
    args: z.tuple([
      z.object({
        video: z.string(),
        step: z.enum(['transcription', 'frame-analysis', 'embedding']),
        progress: z.number(),
        success: z.boolean(),
        stepIndex: z.number(),
        thumbnailUrl: z.string(),
        elapsed: z.string().optional(),
        memoryMB: z.number().optional(),
        scenesProcessed: z.number().optional(),
        totalScenes: z.number().optional(),
        fps: z.number().optional(),
      }),
    ]),
    return: z.void(),
  },
}
