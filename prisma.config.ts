import path from 'path'
import type { PrismaConfig } from 'prisma'

export default {
  schema: path.join('packages', 'prisma', 'schema.prisma'),
  migrations: {
    seed: `pnpm ts-node ${ path.join('packages', 'prisma', 'seed.ts')}`, 
  },
} satisfies PrismaConfig
