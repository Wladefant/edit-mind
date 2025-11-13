import { useForm, FormProvider, type FieldValues, type SubmitHandler } from 'react-hook-form'

interface AuthFormProps<T extends FieldValues> {
  children: React.ReactNode
  onSubmit: SubmitHandler<T>
}

export function AuthForm<T extends FieldValues>({ children, onSubmit }: AuthFormProps<T>) {
  const methods = useForm<T>()

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-5">
        {children}
      </form>
    </FormProvider>
  )
}
