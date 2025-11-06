import z from "zod";
import { unknownFace } from "../conveyor/schemas/app-schema";

export type UnknownFace = z.infer<typeof unknownFace>


export interface FaceIndexingProgress {
  progress: number
  elapsed: string
}