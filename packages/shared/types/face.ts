import z from "zod";
import { unknownFace } from "../schemas";

export type UnknownFace = z.infer<typeof unknownFace>


export interface FaceIndexingProgress {
  progress: number
  elapsed: string
}
export interface KnownFace {
  name: string
  images: string[]
}