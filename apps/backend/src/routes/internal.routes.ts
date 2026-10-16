import { Router, Request, Response } from 'express';
import { executionService } from '../services/execution.service';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export const internalRouter = Router();

// Internal endpoint called by workers to report execution results
internalRouter.post('/execution/internal/result', async (req: Request, res: Response) => {
  const workerSecret = req.headers['x-worker-secret'];
  if (workerSecret !== (process.env.WORKER_SECRET || 'worker-secret')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { jobId, roomId, result } = req.body;

    await executionService.recordResult(jobId, result);

    // Emit via WebSocket is handled by the socket server listening to Redis pub/sub
    logger.info('Execution result recorded', { jobId, status: result.status });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to record execution result', { error: error.message });
    res.status(500).json({ error: 'Failed to record result' });
  }
});
