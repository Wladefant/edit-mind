import { getSession } from './session'
import { prisma } from './database'

export async function getUser(request: Request) {
  const session = await getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId
    }
  })

  return user
}