import z from 'zod'
import { exportedSceneSchema, sceneSchema } from '../schemas'

export type Scene = z.infer<typeof sceneSchema>

export type ExportedScene = z.infer<typeof exportedSceneSchema>
