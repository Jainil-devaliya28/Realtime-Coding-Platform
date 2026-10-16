// ============================================================
// REDIS CLIENT - Connection setup for BullMQ and caching
// ============================================================

import IORedis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

function createRedisClient(options?: RedisOptions): IORedis {
  const client = new IORedis(config.REDIS_URL, {
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis: Max retries exceeded');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    ...options,
  });

  client.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  client.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting...');
  });

  return client;
}

// Main Redis client for general use
export const redis = createRedisClient();

// Separate connection for BullMQ (requires maxRetriesPerRequest: null)
export const bullRedis = createRedisClient({ maxRetriesPerRequest: null });

export async function connectRedis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redis.status === 'ready') {
      resolve();
      return;
    }

    redis.once('ready', resolve);
    redis.once('error', reject);
  });
}

export const REDIS_KEYS = {
  EXECUTION_QUEUE: 'code:execution:queue',
  ACTIVE_ROOMS: 'rooms:active',
  USER_SESSION: (userId: string) => `user:session:${userId}`,
  ROOM_CODE: (roomId: string) => `room:code:${roomId}`,
  ROOM_VERSION: (roomId: string) => `room:version:${roomId}`,
  RATE_LIMIT: (ip: string) => `rate:limit:${ip}`,
  EXECUTION_RESULT: (jobId: string) => `execution:result:${jobId}`,
} as const;
