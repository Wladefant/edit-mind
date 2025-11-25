import { AuthGuard } from '~/features/auth/components/AuthGuard'

export default function ProtectedLayout() {
  return <AuthGuard />
}
