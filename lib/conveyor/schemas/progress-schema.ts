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
        thumbnailUrl: z.string()
      }),
    ]),
    return: z.void(),
  },
}
