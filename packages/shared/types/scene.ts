import z from 'zod'
import { exportedSceneSchema, sceneSchema } from '../conveyor/schemas/app-schema'

export type Scene = z.infer<typeof sceneSchema>

export type ExportedScene = z.infer<typeof exportedSceneSchema>
