// ============================================================
// ROOM CONTROLLER - HTTP handlers for rooms
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { roomService } from '../services/room.service';
import { Language } from '@code-platform/shared';

export class RoomController {
  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await roomService.createRoom(req.user!.userId, req.body);
      res.status(201).json({ room });
    } catch (error) {
      next(error);
    }
  }

  async getRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await roomService.getRoom(req.params.id, req.user?.userId);
      res.json({ room });
    } catch (error) {
      next(error);
    }
  }

  async listRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '12', search, owned } = req.query;
      const result = await roomService.listRooms({
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        search: search as string,
        userId: req.user?.userId,
        ownedByUser: owned === 'true',
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const room = await roomService.updateRoom(
        req.params.id,
        req.user!.userId,
        req.body
      );
      res.json({ room });
    } catch (error) {
      next(error);
    }
  }

  async deleteRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await roomService.deleteRoom(req.params.id, req.user!.userId);
      res.json({ message: 'Room deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async getMyRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = '1', limit = '12' } = req.query;
      const result = await roomService.listRooms({
        page: Number(page),
        limit: Math.min(Number(limit), 50),
        userId: req.user!.userId,
        ownedByUser: true,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const roomController = new RoomController();
