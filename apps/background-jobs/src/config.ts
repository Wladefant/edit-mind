export const config = {
  port: process.env.BACKGROUND_JOBS_PORT || 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  redisHost: process.env.REDIS_HOST || 'redis',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
}
