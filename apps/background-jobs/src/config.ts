import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  databaseUrl: process.env.DATABASE_URL || '',
  pythonServiceUrl: process.env.PYTHON_SERVICE_URL || 'http://python-worker:5000',
  mediaPath: process.env.HOST_MEDIA_PATH || '/media/videos',
};
