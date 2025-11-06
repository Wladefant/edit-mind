import { z } from 'zod'
import { RegisterSchema, LoginSchema } from '~/schemas/auth'
import { prisma } from './database'
import { getSession, commitSession } from './session'
import bcrypt from 'bcryptjs'

export async function register(request: Request, values: z.infer<typeof RegisterSchema>) {
  const user = await prisma.user.findUnique({
    where: {
      email: values.email
    }
  })

  if (user) {
    return {
      error: 'User already exists'
    }
  }

  const passwordHash = await bcrypt.hash(values.password, 10)

  const newUser = await prisma.user.create({
    data: {
      name: values.fullName,
      email: values.email,
      password: passwordHash
    }
  })

  const session = await getSession(request.headers.get('Cookie'))
  session.set('userId', newUser.id)

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/app',
      'Set-Cookie': await commitSession(session)
    }
  })
}

export async function login(request: Request, values: z.infer<typeof LoginSchema>) {
  const user = await prisma.user.findUnique({
    where: {
      email: values.email
    }
  })

  if (!user) {
    return {
      error: 'Invalid email or password'
    }
  }

  const passwordMatch = await bcrypt.compare(values.password, user.password)

  if (!passwordMatch) {
    return {
      error: 'Invalid email or password'
    }
  }

  const session = await getSession(request.headers.get('Cookie'))
  session.set('userId', user.id)

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/app',
      'Set-Cookie': await commitSession(session)
    }
  })
}