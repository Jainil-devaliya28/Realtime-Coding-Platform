// ============================================================
// AUTH SERVICE - Authentication business logic
// ============================================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, UnauthorizedError } from '../middleware/error.middleware';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    avatar?: string | null;
  };
  tokens: TokenPair;
}

export class AuthService {
  private generateTokens(userId: string, email: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, email, role },
      config.JWT_ACCESS_SECRET,
      { expiresIn: config.JWT_ACCESS_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { userId, email, role, jti: uuidv4() },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRY as any }
    );

    return { accessToken, refreshToken };
  }

  async signup(email: string, username: string, password: string): Promise<AuthResult> {
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AppError('Username already taken', 409, 'USERNAME_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    logger.info('New user registered', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
      },
      tokens,
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info('User logged in', { userId: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        avatar: user.avatar,
      },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload: { userId: string; email: string; role: string };

    try {
      payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as typeof payload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired or revoked');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const newTokens = this.generateTokens(payload.userId, payload.email, payload.role);

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        token: newTokens.refreshToken,
        userId: payload.userId,
        expiresAt,
      },
    });

    return newTokens;
  }

  async logout(refreshToken: string, userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    logger.info('User logged out', { userId });
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            ownedRooms: true,
            executionHistory: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User');
    return user;
  }

  async cleanupExpiredTokens(): Promise<void> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
    logger.info('Cleaned up expired tokens', { count: result.count });
  }
}

export const authService = new AuthService();
