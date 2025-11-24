import Redis from 'ioredis'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')
const REDIS_TTL = 3600 // 1 hour default TTL

export const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
})

export async function getCache<T>(key: string): Promise<T | null> {
  const cached = await redisClient.get(key)
  if (!cached) return null
  return JSON.parse(cached) as T
}

export async function setCache<T>(key: string, value: T, ttl = REDIS_TTL): Promise<void> {
  await redisClient.set(key, JSON.stringify(value), 'EX', ttl)
}

export async function invalidateCache(keyPattern: string): Promise<void> {
  const keys = await redisClient.keys(keyPattern)
  if (keys.length > 0) {
    await redisClient.del(...keys)
  }
}
