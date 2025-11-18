import { prisma } from '~/services/database'
import { getUser } from '~/services/user.sever'
import type { LoaderFunctionArgs } from 'react-router'
import { AuthGuard } from '~/features/auth/components/AuthGuard'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUser(request)
  if (!user) {
    return { chats: [] }
  }

  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return { chats }
}

export default function ProtectedLayout() {
  return <AuthGuard />
}
