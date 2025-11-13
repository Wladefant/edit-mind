import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      role: 'admin',
      password: passwordHash,
    },
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: passwordHash,
      role: 'admin',
    },
  })

  console.log('✅ Seeded admin user:', adminUser.email)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
