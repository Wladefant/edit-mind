import { useForm, FormProvider, type FieldValues } from 'react-hook-form';

interface AuthFormProps<T extends FieldValues> {
  children: React.ReactNode
}

export function AuthForm<T extends FieldValues>({ children }: AuthFormProps<T>) {
  const methods = useForm<T>()

  return (
    <FormProvider {...methods}>
      <form method="POST" className="space-y-5">
        {children}
      </form>
    </FormProvider>
  )
}
