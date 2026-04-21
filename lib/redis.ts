import { Redis } from 'ioredis';

// Singleton setup for ioredis
const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  return 'redis://localhost:6379';
};

const createRedisClient = () => {
  return new Redis(getRedisUrl());
};

declare const globalThis: {
  redisGlobal: ReturnType<typeof createRedisClient>;
} & typeof global;

export const redis = globalThis.redisGlobal ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') globalThis.redisGlobal = redis;
