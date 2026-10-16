import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { WorkerJob, Language } from '@code-platform/shared';
import { DockerSandbox } from '../sandbox/docker.sandbox';
import { workerLogger as logger } from '../utils/logger';

const QUEUE_NAME = 'code-execution';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

async function reportResult(jobId: string, roomId: string, result: any): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/execution/internal/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': process.env.WORKER_SECRET || 'worker-secret' },
      body: JSON.stringify({ jobId, roomId, result }),
    });
  } catch (error) {
    logger.error('Error reporting result', { error, jobId });
  }
}

export function createExecutionWorker(concurrency: number = 3): Worker<WorkerJob> {
  const worker = new Worker<WorkerJob>(
    QUEUE_NAME,
    async (job: Job<WorkerJob>) => {
      const { id, roomId, userId, code, language, stdin, timeLimit, memoryLimit } = job.data;
      logger.info('Processing job', { jobId: id, language, userId });

      const sandbox = new DockerSandbox();
      try {
        const result = await sandbox.execute({
          code, language: language as Language, stdin,
          timeLimit: timeLimit || 30, memoryLimit: memoryLimit || 256,
          onOutput: (chunk, stream) => {
            redis.publish('execution:output', JSON.stringify({ roomId, jobId: id, chunk, stream })).catch(() => {});
          },
        });
        await reportResult(id, roomId, result);
        await redis.publish('execution:complete', JSON.stringify({ jobId: id, roomId, result }));
        return result;
      } catch (error: any) {
        const failResult = { stdout: '', stderr: error.message || 'Execution failed', exitCode: 1, executionTime: 0, memoryUsed: 0, status: 'failed' as const };
        await reportResult(id, roomId, failResult);
        await redis.publish('execution:complete', JSON.stringify({ jobId: id, roomId, result: failResult }));
        throw error;
      }
    },
    { connection: redis, concurrency }
  );

  worker.on('completed', (job) => logger.info('Job completed', { jobId: job.id }));
  worker.on('failed', (job, error) => logger.error('Job failed', { jobId: job?.id, error: error.message }));
  worker.on('error', (error) => logger.error('Worker error', { error: error.message }));

  logger.info('Execution worker started', { concurrency });
  return worker;
}
