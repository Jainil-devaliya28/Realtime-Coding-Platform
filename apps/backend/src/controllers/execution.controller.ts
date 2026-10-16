// ============================================================
// EXECUTION CONTROLLER - HTTP handlers for code execution
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { executionService } from '../services/execution.service';

export class ExecutionController {
  async runCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language, stdin } = req.body;
      const { id: roomId } = req.params;

      const job = await executionService.submitExecution({
        roomId,
        userId: req.user!.userId,
        code,
        language,
        stdin,
      });

      res.status(202).json({
        message: 'Execution queued',
        jobId: job.id,
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const job = await executionService.getJobStatus(jobId, req.user!.userId);
      res.json({ job });
    } catch (error) {
      next(error);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: roomId } = req.params;
      const { page = '1', limit = '20' } = req.query;

      const result = await executionService.getExecutionHistory(
        roomId,
        req.user!.userId,
        Number(page),
        Number(limit)
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await executionService.getQueueStats();
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
}

export const executionController = new ExecutionController();
