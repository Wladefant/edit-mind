export const config = {
  port: process.env.PORT || 4000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',
}
