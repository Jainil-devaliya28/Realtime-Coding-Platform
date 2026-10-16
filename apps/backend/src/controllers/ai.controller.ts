// ============================================================
// AI CONTROLLER - HTTP handlers for AI assistant
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';

export class AIController {
  async ask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const { message, code, error, conversationId } = req.body;

      // Set up SSE for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const result = await aiService.ask(
        req.user!.userId,
        roomId,
        { message, code, error, conversationId },
        (chunk) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
        }
      );

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          conversationId: result.conversationId,
        })}\n\n`
      );
      res.end();
    } catch (error) {
      next(error);
    }
  }

  async explainCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language } = req.body;
      const explanation = await aiService.explainCode(code, language);
      res.json({ explanation });
    } catch (error) {
      next(error);
    }
  }

  async analyzeError(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, error: errorMsg, language } = req.body;
      const analysis = await aiService.analyzeError(code, errorMsg, language);
      res.json({ analysis });
    } catch (error) {
      next(error);
    }
  }

  async generateTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language } = req.body;
      const tests = await aiService.generateTests(code, language);
      res.json({ tests });
    } catch (error) {
      next(error);
    }
  }

  async optimizeCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, language } = req.body;
      const optimized = await aiService.optimizeCode(code, language);
      res.json({ optimized });
    } catch (error) {
      next(error);
    }
  }

  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const conversations = await aiService.getUserConversations(req.user!.userId, roomId);
      res.json({ conversations });
    } catch (error) {
      next(error);
    }
  }

  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const conversation = await aiService.getConversationHistory(
        conversationId,
        req.user!.userId
      );
      res.json({ conversation });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
