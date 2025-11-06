import { AuthGuard } from '~/components/auth/AuthGuard'

export default function ProtectedLayout() {
  return <AuthGuard />
}
