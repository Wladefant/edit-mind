import { Scene } from "./scene"

export interface Video {
  source: string
  duration: string | number
  aspect_ratio: string
  camera: string
  category: string
  createdAt: string
  scenes?: Scene[]
  sceneCount?: number
  thumbnailUrl?: string
}
export interface VideoWithScenes extends Video {
  scenes: Scene[]
  sceneCount: number
}