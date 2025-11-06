import { AuthForm } from '~/components/auth/AuthForm'
import { FormInput } from '~/components/auth/FormInput'
import { SubmitButton } from '~/components/auth/SubmitButton'
import { useAuth } from '~/hooks/useAuth'
import type { RegisterFormValues } from '~/types/auth'
import { RegisterSchema } from '~/schemas/auth'

import { AuthHeader } from '~/components/auth/AuthHeader'

import { RedirectLink } from '~/components/auth/RedirectLink'

import { TermsOfService } from '~/components/auth/TermsOfService'
import type { ActionFunctionArgs, MetaFunction } from 'react-router'
import { register } from '~/services/auth.server'

export const meta: MetaFunction = () => {
  return [{ title: 'Register | Edit Mind' }]
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const values = Object.fromEntries(formData)

  const result = RegisterSchema.safeParse(values)
  if (!result.success) {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 })
  }

  return register(request, result.data)
}
export default function Register() {
  const { loading, error, handleAuth } = useAuth()

  const onSubmit = (values: RegisterFormValues) => {
    handleAuth(values, '/auth/register')
  }

  return (
    <>
      <AuthHeader title="Create account" subtitle="Start organizing your video library" />

      <AuthForm onSubmit={onSubmit} schema={RegisterSchema}>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <FormInput name="fullName" type="text" placeholder="Full name" />
        <FormInput name="email" type="email" placeholder="Email" />
        <FormInput name="password" type="password" placeholder="Password" />
        <SubmitButton loading={loading} text="Create account" loadingText="Creating account..." />
      </AuthForm>

      <RedirectLink to="/auth/login" text="Already have an account?" linkText="Sign in" />

      <TermsOfService />
    </>
  )
}
