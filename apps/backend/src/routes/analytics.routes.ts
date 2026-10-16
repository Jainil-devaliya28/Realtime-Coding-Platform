import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth.middleware';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/dashboard',
  authenticate,
  analyticsController.getDashboard.bind(analyticsController)
);

analyticsRouter.get(
  '/trends',
  authenticate,
  analyticsController.getTrends.bind(analyticsController)
);

analyticsRouter.get(
  '/me',
  authenticate,
  analyticsController.getUserAnalytics.bind(analyticsController)
);

analyticsRouter.get(
  '/rooms/:roomId',
  authenticate,
  analyticsController.getRoomAnalytics.bind(analyticsController)
);
