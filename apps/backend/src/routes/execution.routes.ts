import { Router } from 'express';
import { executionController } from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { executionRateLimit } from '../middleware/rateLimit.middleware';

export const executionRouter = Router();

executionRouter.post(
  '/rooms/:id/execute',
  authenticate,
  executionRateLimit,
  validate({ body: schemas.execution.run }),
  executionController.runCode.bind(executionController)
);

executionRouter.get(
  '/jobs/:jobId',
  authenticate,
  executionController.getJobStatus.bind(executionController)
);

executionRouter.get(
  '/rooms/:id/history',
  authenticate,
  executionController.getHistory.bind(executionController)
);

executionRouter.get(
  '/queue/stats',
  authenticate,
  executionController.getQueueStats.bind(executionController)
);
