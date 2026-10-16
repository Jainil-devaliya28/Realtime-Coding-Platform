// ============================================================
// AUTH CONTROLLER - HTTP handlers for authentication
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { config } from '../config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: config.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, username, password } = req.body;
      const result = await authService.signup(email, username, password);

      res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

      res.status(201).json({
        message: 'Account created successfully',
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      res.cookie('refreshToken', result.tokens.refreshToken, COOKIE_OPTIONS);

      res.json({
        message: 'Login successful',
        user: result.user,
        accessToken: result.tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({ error: { message: 'No refresh token provided' } });
        return;
      }

      const tokens = await authService.refreshTokens(refreshToken);

      res.cookie('refreshToken', tokens.refreshToken, COOKIE_OPTIONS);

      res.json({
        accessToken: tokens.accessToken,
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken && req.user) {
        await authService.logout(refreshToken, req.user.userId);
      }

      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await authService.getProfile(req.user!.userId);
      res.json({ user: profile });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
