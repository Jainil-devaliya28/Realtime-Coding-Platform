import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';

export const roomRouter = Router();

roomRouter.get('/', optionalAuth, roomController.listRooms.bind(roomController));
roomRouter.get('/my', authenticate, roomController.getMyRooms.bind(roomController));
roomRouter.get('/:id', optionalAuth, roomController.getRoom.bind(roomController));

roomRouter.post(
  '/',
  authenticate,
  validate({ body: schemas.room.create }),
  roomController.createRoom.bind(roomController)
);

roomRouter.put(
  '/:id',
  authenticate,
  validate({ body: schemas.room.update }),
  roomController.updateRoom.bind(roomController)
);

roomRouter.delete('/:id', authenticate, roomController.deleteRoom.bind(roomController));
