// ============================================================
// AUTH ROUTES
// ============================================================

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import { authRateLimit } from '../middleware/rateLimit.middleware';

export const authRouter = Router();

authRouter.post(
  '/signup',
  authRateLimit,
  validate({ body: schemas.auth.signup }),
  authController.signup.bind(authController)
);

authRouter.post(
  '/login',
  authRateLimit,
  validate({ body: schemas.auth.login }),
  authController.login.bind(authController)
);

authRouter.post(
  '/refresh',
  authController.refresh.bind(authController)
);

authRouter.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

authRouter.get(
  '/me',
  authenticate,
  authController.getProfile.bind(authController)
);
