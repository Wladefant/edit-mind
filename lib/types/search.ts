type ShotType = "medium-shot" | "long-shot" | "close-up";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "8:7";

export interface VideoSearchParams {
  action: string;
  emotions: string[];
  shot_type: ShotType | null;
  aspect_ratio: AspectRatio | null;
  duration: number | null;
  description: string;
  outputFilename: string;
  objects: string[];
  camera?: string;
}

export type SearchQuery = {
  faces?: string[];
  emotions?: string[];
  shot_type?: ShotType | null;
  aspect_ratio?: AspectRatio | null;
  description?: string;
  objects?: string[];
  camera?: string;
};

export interface SearchSuggestion {
  text: string;
  icon: string;
  category: "people" | "emotion" | "scene" | "action";
}

export interface VideoMetadataSummary {
  totalScenes: number;
  topFaces: Array<{ name: string; count: number }>;
  topObjects: Array<{ name: string; count: number }>;
  topEmotions: Array<{ name: string; count: number }>;
  shotTypes: Array<{ name: string; count: number }>;
  aspectRatios: Array<{ name: string; count: number }>;
  cameras: Array<{ name: string; count: number }>;
  sampleDescriptions: string[];
}


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

export  interface VideoConfig {
  duration: number
  aspectRatio: string
  fps: number
}