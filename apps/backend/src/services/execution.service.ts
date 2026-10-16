// ============================================================
// EXECUTION SERVICE - Code execution queue management
// ============================================================

import { Queue, QueueEvents, Worker } from 'bullmq';
import { bullRedis, redis, REDIS_KEYS } from '../config/redis';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  executionDuration,
  executionTotal,
  executionQueueSize,
} from '../config/metrics';
import { Language, WorkerJob } from '@code-platform/shared';
import { Server as SocketServer } from 'socket.io';
import { AppError } from '../middleware/error.middleware';

export const EXECUTION_QUEUE_NAME = 'code-execution';

export const executionQueue = new Queue<WorkerJob>(EXECUTION_QUEUE_NAME, {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const queueEvents = new QueueEvents(EXECUTION_QUEUE_NAME, {
  connection: bullRedis,
});

let socketServer: SocketServer | null = null;

export function setSocketServer(io: SocketServer): void {
  socketServer = io;
}

export class ExecutionService {
  async submitExecution(data: {
    roomId: string;
    userId: string;
    code: string;
    language: Language;
    stdin?: string;
  }) {
    // Check queue size
    const queueSize = await executionQueue.count();
    if (queueSize >= config.MAX_QUEUE_SIZE) {
      throw new AppError('Execution queue is full, please try again later', 503, 'QUEUE_FULL');
    }

    // Create job record in DB
    const job = await prisma.executionJob.create({
      data: {
        roomId: data.roomId,
        userId: data.userId,
        code: data.code,
        language: data.language as any,
        stdin: data.stdin,
        status: 'pending',
      },
    });

    // Determine priority (admin users get higher priority)
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { role: true },
    });
    const priority = user?.role === 'admin' ? 1 : 10;

    // Add to BullMQ queue
    const workerJob: WorkerJob = {
      id: job.id,
      roomId: data.roomId,
      userId: data.userId,
      code: data.code,
      language: data.language,
      stdin: data.stdin,
      timeLimit: config.MAX_EXECUTION_TIME,
      memoryLimit: config.MAX_MEMORY_MB,
    };

    await executionQueue.add(`exec-${job.id}`, workerJob, {
      priority,
      jobId: job.id,
    });

    // Update queue metrics
    const newQueueSize = await executionQueue.count();
    executionQueueSize.set(newQueueSize);

    logger.info('Execution job submitted', {
      jobId: job.id,
      language: data.language,
      userId: data.userId,
    });

    // Emit started event
    if (socketServer) {
      socketServer.to(`room:${data.roomId}`).emit('execution:started', {
        jobId: job.id,
      });
    }

    return job;
  }

  async getJobStatus(jobId: string, userId: string) {
    const job = await prisma.executionJob.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) throw new AppError('Job not found', 404, 'NOT_FOUND');

    // Check for result in Redis
    const cachedResult = await redis.get(REDIS_KEYS.EXECUTION_RESULT(jobId));
    if (cachedResult) {
      return { ...job, result: JSON.parse(cachedResult) };
    }

    return job;
  }

  async getExecutionHistory(roomId: string, userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      prisma.executionHistory.findMany({
        where: { roomId, userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          language: true,
          status: true,
          exitCode: true,
          executionTime: true,
          memoryUsed: true,
          createdAt: true,
          stdout: true,
          stderr: true,
        },
      }),
      prisma.executionHistory.count({ where: { roomId, userId } }),
    ]);

    return {
      history,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async recordResult(
    jobId: string,
    result: {
      stdout: string;
      stderr: string;
      exitCode: number;
      executionTime: number;
      memoryUsed: number;
      status: string;
    }
  ): Promise<void> {
    // Get job info
    const job = await prisma.executionJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      logger.error('Job not found for result recording', { jobId });
      return;
    }

    // Update job status
    await prisma.executionJob.update({
      where: { id: jobId },
      data: {
        status: result.status as any,
        completedAt: new Date(),
      },
    });

    // Create history record
    await prisma.executionHistory.create({
      data: {
        jobId,
        roomId: job.roomId,
        userId: job.userId,
        code: job.code,
        language: job.language,
        stdin: job.stdin,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        status: result.status as any,
      },
    });

    // Cache result
    await redis.setex(
      REDIS_KEYS.EXECUTION_RESULT(jobId),
      3600, // 1 hour TTL
      JSON.stringify(result)
    );

    // Update metrics
    executionDuration.observe(
      { language: job.language, status: result.status },
      result.executionTime / 1000
    );
    executionTotal.inc({ language: job.language, status: result.status });
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      executionQueue.getWaiting(),
      executionQueue.getActive(),
      executionQueue.getCompleted(),
      executionQueue.getFailed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }
}

export const executionService = new ExecutionService();
