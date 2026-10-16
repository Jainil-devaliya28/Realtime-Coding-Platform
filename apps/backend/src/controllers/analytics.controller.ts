// ============================================================
// ANALYTICS CONTROLLER - HTTP handlers for analytics
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getDashboardStats();
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }

  async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { days = '7' } = req.query;
      const trends = await analyticsService.getExecutionTrends(Number(days));
      res.json({ trends });
    } catch (error) {
      next(error);
    }
  }

  async getUserAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await analyticsService.getUserAnalytics(req.user!.userId);
      res.json({ analytics });
    } catch (error) {
      next(error);
    }
  }

  async getRoomAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { roomId } = req.params;
      const analytics = await analyticsService.getRoomAnalytics(roomId);
      res.json({ analytics });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
