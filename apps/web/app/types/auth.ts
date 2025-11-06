import { z } from 'zod'
import type { LoginSchema, RegisterSchema } from '~/schemas/auth'


export type LoginFormValues = z.infer<typeof LoginSchema>
export type RegisterFormValues = z.infer<typeof RegisterSchema>
