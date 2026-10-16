// ============================================================
// REDIS PUBSUB BRIDGE - Forwards worker output to WebSocket clients
// ============================================================

import IORedis from 'ioredis';
import { Server as SocketServer } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';

export function startRedisBridge(io: SocketServer): void {
  const subscriber = new IORedis(config.REDIS_URL, {
    password: config.REDIS_PASSWORD || undefined,
  });

  subscriber.subscribe('execution:output', 'execution:complete', 'execution:status', (err) => {
    if (err) {
      logger.error('Failed to subscribe to Redis channels', { error: err.message });
      return;
    }
    logger.info('Redis pub/sub bridge started');
  });

  subscriber.on('message', (channel: string, message: string) => {
    try {
      const data = JSON.parse(message);

      if (channel === 'execution:output') {
        const { roomId, jobId, chunk, stream } = data;
        io.to(`room:${roomId}`).emit('execution:output', { jobId, chunk, stream });
      } else if (channel === 'execution:complete') {
        const { roomId, result } = data;
        io.to(`room:${roomId}`).emit('execution:completed', result);
      } else if (channel === 'execution:status') {
        const { roomId, jobId, status } = data;
        if (status === 'running') {
          io.to(`room:${roomId}`).emit('execution:started', { jobId });
        }
      }
    } catch (error) {
      logger.error('Error processing Redis message', { channel, error });
    }
  });

  subscriber.on('error', (err) => {
    logger.error('Redis subscriber error', { error: err.message });
  });
}
