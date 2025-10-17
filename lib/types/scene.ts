export type Scene = {
  id: string
  startTime: number;
  endTime: number;
  objects: string[];
  faces:string[];
  transcription: string;
  description: string;
  shot_type: string;
  thumbnailUrl?: string;
  emotions: { name: string; emotion: string }[];
  source: string;
  category?: string;
  aspect_ratio?: string;
  camera: string;
  createdAt: string
};

export type ExportedScene = {
  startTime: number;
  endTime: number;
  source: string;

}