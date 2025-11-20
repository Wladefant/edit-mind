import { z } from 'zod'

const emotionSchema = z.object({
  name: z.string(),
  emotion: z.string(),
})

export const sceneSchema = z.object({
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
  dominantColorHex: z.string(),
  dominantColorName: z.string(),
  location: z.string(),
  duration: z.number().optional(),
  detectedText: z.array(z.string()),
})

export const videoSchema = z.object({
  source: z.string(),
  duration: z.union([z.string(), z.number()]),
  aspect_ratio: z.string(),
  camera: z.string(),
  category: z.string(),
  createdAt: z.string(),
  scenes: z.array(sceneSchema).optional(),
  sceneCount: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  dominantColorHex: z.string().optional(),
  dominantColorName: z.string().optional(),
})

export const searchSuggestionSchema = z.object({
  text: z.string(),
  icon: z.string(),
  category: z.union([
    z.literal('people'),
    z.literal('emotion'),
    z.literal('scene'),
    z.literal('action'),
    z.literal('color'),
  ]),
})

export const exportedSceneSchema = z.object({
  startTime: z.number(),
  endTime: z.number(),
  source: z.string(),
})

const settingsSchema = z.object({
  sample_interval_seconds: z.number(),
  max_workers: z.number(),
  batch_size: z.number(),
  yolo_confidence: z.number(),
  yolo_iou: z.number(),
  resize_to_1080p: z.boolean(),
  yolo_model: z.string(),
  output_dir: z.string(),
})

const faceDataSchema = z.object({
  name: z.string(),
  thumbnail: z.string().optional(),
  count: z.number(),
})

const NameCountSchema = z.object({
  name: z.string(),
  count: z.number(),
})

export const VideoMetadataSummarySchema = z.object({
  totalScenes: z.number(),
  topFaces: z.array(NameCountSchema),
  topObjects: z.array(NameCountSchema),
  topEmotions: z.array(NameCountSchema),
  shotTypes: z.array(NameCountSchema),
  aspectRatios: z.array(NameCountSchema),
  cameras: z.array(NameCountSchema),
  sampleDescriptions: z.array(z.string()),
  topColors: z.array(NameCountSchema),
})

export const unknownFace = z.object({
  image_file: z.string(),
  json_file: z.string(),
  image_hash: z.string(),
  created_at: z.string(),
  video_path: z.string(),
  video_name: z.string(),
  frame_index: z.number(),
  timestamp_ms: z.number(),
  timestamp_seconds: z.number(),
  formatted_timestamp: z.string(),
  frame_dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }),
  face_id: z.string(),
  bounding_box: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  padded_bounding_box: z.object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  face_center: z.object({
    x: z.number(),
    y: z.number(),
  }),
  face_encoding: z.array(z.number()),
  context: z.object({
    detected_objects: z.array(
      z.object({
        label: z.string(),
        confidence: z.number(),
        box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      })
    ),
    scene_type: z.string().nullable(),
    environment: z.string().nullable(),
    other_faces_in_frame: z.array(z.string()),
  }),
  label: z.object({
    name: z.string().nullable(),
    labeled_by: z.string().nullable(),
    labeled_at: z.string().nullable(),
    confidence: z.number().nullable(),
    notes: z.string().nullable(),
  }),
  quality: z.object({
    face_size_pixels: z.number(),
    face_coverage_percent: z.number(),
    aspect_ratio: z.number(),
  }),
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
    args: z.array(VideoMetadataSummarySchema),
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
    args: z.tuple([z.array(exportedSceneSchema), z.string(), z.string(), z.number()]),
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
  getSettings: {
    args: z.tuple([]),
    return: settingsSchema,
  },
  saveSettings: {
    args: z.tuple([settingsSchema]),
    return: z.object({ success: z.boolean() }),
  },
  getKnownFaces: {
    args: z.tuple([]),
    return: z.record(z.string(), z.array(z.string())),
  },
  getUnknownFaces: {
    args: z.tuple([]),
    return: z.array(unknownFace),
  },
  deleteUnknownFace: {
    args: z.tuple([z.string(), z.string()]),
    return: z.object({ success: z.boolean() }),
  },
  labelUnknownFace: {
    args: z.tuple([z.string(), z.string(), z.string()]),
    return: z.object({ success: z.boolean() }),
  },
  reindexAllFaces: {
    args: z.tuple([z.string(), z.string(), z.string()]),
    return: z.object({ success: z.boolean() }),
  },
  getAllFaces: {
    args: z.tuple([]),
    return: z.array(faceDataSchema),
  },
  getLocationName: {
    args: z.tuple([z.string()]),
    return: z.string(),
  },
  labelFace: {
    args: z.tuple([z.string(), z.string()]),
    return: z.void(),
  },
  mergeFaces: {
    args: z.tuple([z.array(z.string())]),
    return: z.promise(z.string()),
  }
}
