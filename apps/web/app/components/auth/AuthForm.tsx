import { useForm, FormProvider, type FieldValues, type SubmitHandler } from 'react-hook-form'
import { z } from 'zod'

interface AuthFormProps<T extends FieldValues> {
  children: React.ReactNode
  onSubmit: SubmitHandler<T>
  schema: z.ZodType<T>
}

export function AuthForm<T extends FieldValues>({ children, onSubmit, schema }: AuthFormProps<T>) {
  const methods = useForm<T>()

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
        {children}
      </form>
    </FormProvider>
  )
}
