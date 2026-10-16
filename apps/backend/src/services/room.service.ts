// ============================================================
// ROOM SERVICE - Room management business logic
// ============================================================

import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../utils/logger';
import { NotFoundError, ForbiddenError, AppError } from '../middleware/error.middleware';
import { Language } from '@code-platform/shared';

export class RoomService {
  async createRoom(
    ownerId: string,
    data: {
      name: string;
      description?: string;
      language: Language;
      isPublic: boolean;
    }
  ) {
    const room = await prisma.room.create({
      data: {
        ...data,
        ownerId,
        code: this.getDefaultCode(data.language),
      },
      include: {
        owner: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // Cache initial code
    await redis.set(REDIS_KEYS.ROOM_CODE(room.id), room.code);
    await redis.set(REDIS_KEYS.ROOM_VERSION(room.id), '0');

    logger.info('Room created', { roomId: room.id, ownerId });
    return room;
  }

  async getRoom(roomId: string, userId?: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId, isActive: true },
      include: {
        owner: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!room) throw new NotFoundError('Room');

    if (!room.isPublic && userId !== room.ownerId) {
      const membership = await prisma.roomMembership.findUnique({
        where: { userId_roomId: { userId: userId!, roomId } },
      });
      if (!membership) throw new ForbiddenError('This room is private');
    }

    // Get latest code from cache or DB
    const cachedCode = await redis.get(REDIS_KEYS.ROOM_CODE(room.id));
    if (cachedCode !== null) {
      room.code = cachedCode;
    }

    return room;
  }

  async listRooms(options: {
    page: number;
    limit: number;
    search?: string;
    userId?: string;
    ownedByUser?: boolean;
  }) {
    const { page, limit, search, userId, ownedByUser } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = {
      isActive: true,
    };

    if (ownedByUser && userId) {
      where.ownerId = userId;
    } else if (!ownedByUser) {
      where.isPublic = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: {
            select: { id: true, username: true, avatar: true },
          },
          _count: {
            select: { memberships: true, executionHistory: true },
          },
        },
      }),
      prisma.room.count({ where }),
    ]);

    return {
      rooms,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateRoom(
    roomId: string,
    userId: string,
    data: { name?: string; description?: string; language?: Language; isPublic?: boolean }
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundError('Room');
    if (room.ownerId !== userId) throw new ForbiddenError('Only owner can update room');

    return prisma.room.update({
      where: { id: roomId },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async deleteRoom(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundError('Room');
    if (room.ownerId !== userId) throw new ForbiddenError('Only owner can delete room');

    await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });

    // Clean up cache
    await redis.del(REDIS_KEYS.ROOM_CODE(roomId));
    await redis.del(REDIS_KEYS.ROOM_VERSION(roomId));

    logger.info('Room deleted', { roomId, userId });
  }

  async updateCode(roomId: string, code: string, version: number): Promise<void> {
    // Update Redis cache
    await redis.set(REDIS_KEYS.ROOM_CODE(roomId), code);
    await redis.set(REDIS_KEYS.ROOM_VERSION(roomId), version.toString());

    // Persist to DB (debounced in production via separate worker)
    await prisma.room.update({
      where: { id: roomId },
      data: { code, version, updatedAt: new Date() },
    });
  }

  async getActiveRoomsCount(): Promise<number> {
    const keys = await redis.keys('room:active:*');
    return keys.length;
  }

  private getDefaultCode(language: Language): string {
    const defaults: Record<Language, string> = {
      python: `# Python - Welcome to the collaborative editor!
def main():
    print("Hello, World!")
    
if __name__ == "__main__":
    main()
`,
      javascript: `// JavaScript - Welcome to the collaborative editor!
function main() {
    console.log("Hello, World!");
}

main();
`,
      cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
      java: `public class Solution {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
      verilog: `// Verilog - Simple testbench
module testbench;
    reg clk;
    reg reset;
    
    initial begin
        clk = 0;
        reset = 1;
        #10 reset = 0;
        #100 $finish;
    end
    
    always #5 clk = ~clk;
    
    initial begin
        $dumpfile("output.vcd");
        $dumpvars(0, testbench);
    end
endmodule
`,
    };

    return defaults[language] || '';
  }
}

export const roomService = new RoomService();
