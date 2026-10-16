import 'dotenv/config';
import { createExecutionWorker } from './queue/processor';
import { pullExecutorImages } from './sandbox/docker.sandbox';
import { workerLogger as logger } from './utils/logger';

const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '3');

async function main(): Promise<void> {
  logger.info('Starting code execution worker', { workerId: WORKER_ID, concurrency: CONCURRENCY });
  await pullExecutorImages();
  const worker = createExecutionWorker(CONCURRENCY);
  logger.info('Worker ready for jobs', { workerId: WORKER_ID });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, closing worker...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => { logger.error('Uncaught exception', { error: error.message }); process.exit(1); });
  process.on('unhandledRejection', (reason) => { logger.error('Unhandled rejection', { reason }); process.exit(1); });

  setInterval(() => logger.debug('Worker heartbeat', { workerId: WORKER_ID, uptime: process.uptime() }), 30000);
}

main().catch((error) => { logger.error('Fatal startup error', { error }); process.exit(1); });
