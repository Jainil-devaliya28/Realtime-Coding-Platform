// ============================================================
// SOCKET SERVER - Real-time collaboration with Socket.IO
// ============================================================

import { Server as HTTPServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../config/prisma';
import { redis, REDIS_KEYS } from '../config/redis';
import { roomService } from '../services/room.service';
import { executionService, setSocketServer } from '../services/execution.service';
import { aiService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { wsConnectionsActive, wsConnectionsTotal } from '../config/metrics';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  CollaborationUser,
  USER_COLORS,
  Language,
} from '@code-platform/shared';

// Map of roomId -> Map of userId -> CollaborationUser
const roomUsers = new Map<string, Map<string, CollaborationUser & { socketId: string }>>();

// Map of socketId -> { userId, roomId }
const socketRoomMap = new Map<string, { userId: string; roomId: string }>();

function getUserColor(userId: string): string {
  const index = userId.charCodeAt(0) % USER_COLORS.length;
  return USER_COLORS[index];
}

async function verifySocketToken(token: string): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    return payload;
  } catch {
    return null;
  }
}

export function createSocketServer(httpServer: HTTPServer): SocketServer {
  const io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          origin === config.FRONTEND_URL ||
          origin === config.APP_URL ||
          origin === 'http://localhost:3000' ||
          origin === 'https://realtime-code-platform.vercel.app' ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Pass socket server to execution service for streaming
  setSocketServer(io as any);

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    wsConnectionsActive.inc();
    wsConnectionsTotal.inc();
    logger.debug('Socket connected', { socketId: socket.id });

    // ============================================================
    // ROOM JOIN
    // ============================================================
    socket.on('room:join', async ({ roomId, token }) => {
      try {
        const payload = await verifySocketToken(token);
        if (!payload) {
          socket.emit('room:error', { message: 'Authentication failed' });
          return;
        }

        const { userId } = payload;

        // Get room from DB
        const room = await prisma.room.findUnique({
          where: { id: roomId, isActive: true },
          include: { owner: { select: { id: true, username: true, avatar: true } } },
        });

        if (!room) {
          socket.emit('room:error', { message: 'Room not found' });
          return;
        }

        // Get user info
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, avatar: true },
        });

        if (!user) {
          socket.emit('room:error', { message: 'User not found' });
          return;
        }

        // Join socket room
        socket.join(`room:${roomId}`);
        socketRoomMap.set(socket.id, { userId, roomId });

        // Initialize room users map
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }

        const collaborationUser: CollaborationUser & { socketId: string } = {
          userId,
          username: user.username,
          avatar: user.avatar || undefined,
          color: getUserColor(userId),
          isTyping: false,
          socketId: socket.id,
        };

        roomUsers.get(roomId)!.set(userId, collaborationUser);

        // Track active room in Redis
        await redis.sadd(REDIS_KEYS.ACTIVE_ROOMS, roomId);

        // Record collaboration session
        await prisma.collaborationSession.create({
          data: {
            roomId,
            userId,
            socketId: socket.id,
          },
        });

        // Get latest code
        const cachedCode = await redis.get(REDIS_KEYS.ROOM_CODE(roomId));
        const cachedVersion = await redis.get(REDIS_KEYS.ROOM_VERSION(roomId));

        const roomData = {
          ...room,
          code: cachedCode !== null ? cachedCode : room.code,
          version: cachedVersion ? parseInt(cachedVersion) : room.version,
        };

        // Get current users in room
        const currentUsers = Array.from(roomUsers.get(roomId)!.values()).map(
          ({ socketId: _, ...u }) => u
        );

        // Emit to the joining user
        socket.emit('room:joined', { room: roomData as any, users: currentUsers });

        // Notify other users
        socket.to(`room:${roomId}`).emit('room:user_joined', collaborationUser);

        logger.info('User joined room', { userId, roomId, socketId: socket.id });
      } catch (error) {
        logger.error('Error joining room', { error, socketId: socket.id });
        socket.emit('room:error', { message: 'Failed to join room' });
      }
    });

    // ============================================================
    // ROOM LEAVE
    // ============================================================
    socket.on('room:leave', async ({ roomId }) => {
      await handleLeaveRoom(socket, roomId);
    });

    // ============================================================
    // CODE CHANGES (Operational Transform)
    // ============================================================
    socket.on('code:change', async (change) => {
      const roomInfo = socketRoomMap.get(socket.id);
      if (!roomInfo) return;

      const { roomId, userId } = roomInfo;

      // Broadcast to other users in room
      socket.to(`room:${roomId}`).emit('code:change', {
        ...change,
        userId,
      });

      // Update code in Redis (debounced persistence)
      if (change.type === 'replace' && change.text !== undefined) {
        await redis.set(REDIS_KEYS.ROOM_CODE(roomId), change.text);
        await redis.set(REDIS_KEYS.ROOM_VERSION(roomId), change.version.toString());

        // Debounced DB persist (every 5 seconds in production)
        await roomService.updateCode(roomId, change.text, change.version);
      }
    });

    // ============================================================
    // CURSOR UPDATES
    // ============================================================
    socket.on('code:cursor', (cursor) => {
      const roomInfo = socketRoomMap.get(socket.id);
      if (!roomInfo) return;

      const { roomId, userId } = roomInfo;
      socket.to(`room:${roomId}`).emit('code:cursor', { userId, cursor });

      // Update stored cursor position
      const roomUsersMap = roomUsers.get(roomId);
      if (roomUsersMap?.has(userId)) {
        roomUsersMap.get(userId)!.cursor = cursor;
      }
    });

    // ============================================================
    // TYPING INDICATORS
    // ============================================================
    socket.on('code:typing', (isTyping) => {
      const roomInfo = socketRoomMap.get(socket.id);
      if (!roomInfo) return;

      const { roomId, userId } = roomInfo;
      socket.to(`room:${roomId}`).emit('code:typing', { userId, isTyping });

      // Update typing state
      const roomUsersMap = roomUsers.get(roomId);
      if (roomUsersMap?.has(userId)) {
        roomUsersMap.get(userId)!.isTyping = isTyping;
      }
    });

    // ============================================================
    // CODE EXECUTION VIA SOCKET
    // ============================================================
    socket.on('execution:run', async ({ code, language, stdin }) => {
      const roomInfo = socketRoomMap.get(socket.id);
      if (!roomInfo) {
        socket.emit('execution:error', {
          jobId: 'unknown',
          message: 'Not in a room',
        });
        return;
      }

      const { roomId, userId } = roomInfo;

      try {
        await executionService.submitExecution({
          roomId,
          userId,
          code,
          language: language as Language,
          stdin,
        });
      } catch (error: any) {
        socket.emit('execution:error', {
          jobId: 'unknown',
          message: error.message || 'Failed to submit execution',
        });
      }
    });

    // ============================================================
    // AI ASSISTANT VIA SOCKET
    // ============================================================
    socket.on('ai:ask', async ({ conversationId, message, code, error }) => {
      const roomInfo = socketRoomMap.get(socket.id);
      if (!roomInfo) return;

      const { roomId, userId } = roomInfo;
      const newConversationId = conversationId || '';

      try {
        const result = await aiService.ask(
          userId,
          roomId,
          { message, code, error, conversationId: newConversationId || undefined },
          (chunk) => {
            socket.emit('ai:response', {
              conversationId: result?.conversationId || newConversationId,
              chunk,
              done: false,
            });
          }
        );

        socket.emit('ai:response', {
          conversationId: result.conversationId,
          chunk: '',
          done: true,
        });
      } catch (err: any) {
        logger.error('AI socket error', { error: err, userId });
        socket.emit('ai:response', {
          conversationId: newConversationId,
          chunk: `Error: ${err.message}`,
          done: true,
        });
      }
    });

    // ============================================================
    // DISCONNECT
    // ============================================================
    socket.on('disconnect', async () => {
      wsConnectionsActive.dec();

      const roomInfo = socketRoomMap.get(socket.id);
      if (roomInfo) {
        await handleLeaveRoom(socket, roomInfo.roomId);
      }

      logger.debug('Socket disconnected', { socketId: socket.id });
    });
  });

  return io;
}

async function handleLeaveRoom(socket: Socket, roomId: string): Promise<void> {
  const roomInfo = socketRoomMap.get(socket.id);
  if (!roomInfo || roomInfo.roomId !== roomId) return;

  const { userId } = roomInfo;

  socket.leave(`room:${roomId}`);
  socketRoomMap.delete(socket.id);

  // Remove from room users
  const roomUsersMap = roomUsers.get(roomId);
  if (roomUsersMap) {
    roomUsersMap.delete(userId);
    if (roomUsersMap.size === 0) {
      roomUsers.delete(roomId);
      await redis.srem(REDIS_KEYS.ACTIVE_ROOMS, roomId);
    }
  }

  // Update collaboration session
  await prisma.collaborationSession.updateMany({
    where: { socketId: socket.id, leftAt: null },
    data: { leftAt: new Date() },
  });

  // Notify room
  socket.to(`room:${roomId}`).emit('room:user_left', { userId });

  logger.info('User left room', { userId, roomId });
}

// Export for streaming execution output
export function streamExecutionOutput(
  io: SocketServer,
  roomId: string,
  jobId: string,
  chunk: string,
  stream: 'stdout' | 'stderr'
): void {
  io.to(`room:${roomId}`).emit('execution:output', { jobId, chunk, stream });
}

export function streamExecutionComplete(
  io: SocketServer,
  roomId: string,
  result: any
): void {
  io.to(`room:${roomId}`).emit('execution:completed', result);
}
