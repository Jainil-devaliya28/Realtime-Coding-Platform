// ============================================================
// BACKEND ENTRY POINT - Express + Socket.IO server
// ============================================================

import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/prisma';
import { connectRedis, redis } from './config/redis';
import { register, httpRequestDuration, httpRequestTotal } from './config/metrics';
import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import { executionRouter } from './routes/execution.routes';
import { aiRouter } from './routes/ai.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiRateLimit } from './middleware/rateLimit.middleware';
import { createSocketServer } from './workers/socket.server';
import { startRedisBridge } from './workers/redis.bridge';
import { internalRouter } from './routes/internal.routes';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  // Initialize Express
  const app = express();
  const httpServer = http.createServer(app);

  // ============================================================
  // SECURITY MIDDLEWARE
  // ============================================================
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", config.FRONTEND_URL],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  const allowedOrigins = [
    config.FRONTEND_URL,
    config.APP_URL,
    'http://localhost:3000',
    'https://realtime-code-platform.vercel.app',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // ============================================================
  // STANDARD MIDDLEWARE
  // ============================================================
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser(config.COOKIE_SECRET));

  // Request logging
  if (config.NODE_ENV !== 'test') {
    app.use(
      morgan('combined', {
        stream: { write: (msg) => logger.info(msg.trim()) },
        skip: (req) => req.url === '/health' || req.url === '/metrics',
      })
    );
  }

  // ============================================================
  // METRICS MIDDLEWARE
  // ============================================================
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.url;
      httpRequestDuration.observe(
        { method: req.method, route, status_code: res.statusCode.toString() },
        duration
      );
      httpRequestTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      });
    });
    next();
  });

  // ============================================================
  // HEALTH & METRICS ENDPOINTS
  // ============================================================
  app.get('/health', async (req, res) => {
    try {
      await redis.ping();
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    } catch {
      res.status(503).json({ status: 'unhealthy' });
    }
  });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

  // ============================================================
  // API ROUTES
  // ============================================================
  app.use('/api', apiRateLimit);
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/execution', executionRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api', internalRouter);

  // ============================================================
  // ERROR HANDLING
  // ============================================================
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ============================================================
  // WEBSOCKET SERVER
  // ============================================================
  const io = createSocketServer(httpServer);
  startRedisBridge(io as any);

  // ============================================================
  // START SERVER
  // ============================================================
  await connectDatabase();
  await connectRedis();

  httpServer.listen(config.PORT, () => {
    logger.info(`🚀 Server running on port ${config.PORT}`);
    logger.info(`🌍 Environment: ${config.NODE_ENV}`);
    logger.info(`📡 WebSocket server initialized`);
    logger.info(`📊 Metrics available at /metrics`);
  });

  // ============================================================
  // GRACEFUL SHUTDOWN
  // ============================================================
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);

    httpServer.close(async () => {
      await disconnectDatabase();
      await redis.quit();
      logger.info('Server shut down successfully');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason });
    process.exit(1);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
