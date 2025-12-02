import { z } from 'zod'
import type { LoginSchema, RegisterSchema } from '~/features/auth/schemas/auth'


export type LoginFormValues = z.infer<typeof LoginSchema>
export type RegisterFormValues = z.infer<typeof RegisterSchema>
