import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { aiRateLimit } from '../middleware/rateLimit.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { z } from 'zod';

export const aiRouter = Router();

aiRouter.post(
  '/rooms/:roomId/ask',
  authenticate,
  aiRateLimit,
  validate({ body: schemas.ai.ask }),
  aiController.ask.bind(aiController)
);

aiRouter.post(
  '/explain',
  authenticate,
  aiRateLimit,
  validate({
    body: z.object({
      code: z.string().min(1).max(50000),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
    }),
  }),
  aiController.explainCode.bind(aiController)
);

aiRouter.post(
  '/analyze-error',
  authenticate,
  aiRateLimit,
  validate({
    body: z.object({
      code: z.string().min(1).max(50000),
      error: z.string().min(1).max(5000),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
    }),
  }),
  aiController.analyzeError.bind(aiController)
);

aiRouter.post(
  '/generate-tests',
  authenticate,
  aiRateLimit,
  validate({
    body: z.object({
      code: z.string().min(1).max(50000),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
    }),
  }),
  aiController.generateTests.bind(aiController)
);

aiRouter.post(
  '/optimize',
  authenticate,
  aiRateLimit,
  validate({
    body: z.object({
      code: z.string().min(1).max(50000),
      language: z.enum(['python', 'javascript', 'cpp', 'java', 'verilog']),
    }),
  }),
  aiController.optimizeCode.bind(aiController)
);

aiRouter.get(
  '/rooms/:roomId/conversations',
  authenticate,
  aiController.getConversations.bind(aiController)
);

aiRouter.get(
  '/conversations/:conversationId',
  authenticate,
  aiController.getConversation.bind(aiController)
);
