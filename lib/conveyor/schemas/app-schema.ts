import { z } from 'zod'

const emotionSchema = z.object({
  name: z.string(),
  emotion: z.string(),
})

const sceneSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  objects: z.array(z.string()),
  faces: z.array(z.string()),
  transcription: z.string(),
  description: z.string(),
  shot_type: z.string(),
  thumbnailUrl: z.string().optional(),
  emotions: z.array(emotionSchema),
  source: z.string(),
  category: z.string().optional(),
  aspect_ratio: z.string().optional(),
  camera: z.string(),
  createdAt: z.string(),
})

const videoSchema = z.object({
  source: z.string(),
  duration: z.union([z.string(), z.number()]),
  aspect_ratio: z.string(),
  camera: z.string(),
  category: z.string(),
  createdAt: z.string(),
  scenes: z.array(sceneSchema).optional(),
  sceneCount: z.number().optional(),
})

const searchSuggestionSchema = z.object({
  text: z.string(),
  icon: z.string(),
  category: z.union([z.literal('people'), z.literal('emotion'), z.literal('scene'), z.literal('action')]),
})

const exportedSceneSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  source: z.string(),
})

export const appIpcSchema = {
  version: {
    args: z.tuple([]),
    return: z.string(),
  },
  selectFolder: {
    args: z.tuple([]),
    return: z
      .object({
        folderPath: z.string(),
        videos: z.array(z.string()),
      })
      .nullable(),
  },
  startIndexing: {
    args: z.tuple([z.array(z.string())]),
    return: z.void(),
  },
  getAllVideos: {
    args: z.tuple([]),
    return: z.array(videoSchema),
  },
  generateSearchSuggestions: {
    args: z.tuple([z.any()]), // TODO: Define a proper schema for metadataSummary
    return: z.array(searchSuggestionSchema),
  },
  searchDocuments: {
    args: z.tuple([z.string()]),
    return: z.object({
      results: z.array(sceneSchema),
      duration: z.number().nullable(),
      aspect_ratio: z.string().nullable(),
      faces: z.array(z.string()).nullable(),
    }),
  },
  stitchVideos: {
    args: z.tuple([z.array(exportedSceneSchema), z.string(), z.string(), z.number(), z.number()]),
    return: z.void(),
  },
  exportToFcpXml: {
    args: z.tuple([z.array(exportedSceneSchema), z.string(), z.string()]),
    return: z.void(),
  },
  openFile: {
    args: z.tuple([z.string()]),
    return: z.object({ success: z.boolean() }),
  },
  showInFolder: {
    args: z.tuple([z.string()]),
    return: z.object({ success: z.boolean() }),
  },
}
