// ============================================================
// ANALYTICS SERVICE - Platform metrics and reporting
// ============================================================

import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { executionQueue } from './execution.service';

export class AnalyticsService {
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalRooms,
      todayExecutions,
      totalExecutions,
      recentActivity,
      languageStats,
      queueStats,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.room.count({ where: { isActive: true } }),
      prisma.executionHistory.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.executionHistory.count(),
      prisma.executionHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true } },
          room: { select: { name: true } },
        },
      }),
      prisma.executionHistory.groupBy({
        by: ['language'],
        _count: { language: true },
      }),
      this.getQueueStats(),
    ]);

    // Calculate success rate
    const [successCount, totalCount] = await Promise.all([
      prisma.executionHistory.count({ where: { status: 'completed' } }),
      prisma.executionHistory.count(),
    ]);

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    // Average execution time
    const avgTimeResult = await prisma.executionHistory.aggregate({
      _avg: { executionTime: true },
      where: { status: 'completed', executionTime: { not: null } },
    });

    return {
      totalUsers,
      totalRooms,
      todayExecutions,
      totalExecutions,
      successRate: Math.round(successRate * 100) / 100,
      avgExecutionTime: avgTimeResult._avg.executionTime || 0,
      recentActivity,
      languageDistribution: Object.fromEntries(
        languageStats.map((s) => [s.language, s._count.language])
      ),
      queue: queueStats,
    };
  }

  async getExecutionTrends(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await prisma.$queryRaw<
      { date: Date; count: bigint; success: bigint }[]
    >`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'completed') as success
      FROM execution_history
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return results.map((r) => ({
      date: r.date,
      total: Number(r.count),
      success: Number(r.success),
      failure: Number(r.count) - Number(r.success),
    }));
  }

  async getUserAnalytics(userId: string) {
    const [totalExecutions, byLanguage, recentRooms, successRate] = await Promise.all([
      prisma.executionHistory.count({ where: { userId } }),
      prisma.executionHistory.groupBy({
        by: ['language'],
        where: { userId },
        _count: { language: true },
      }),
      prisma.roomMembership.findMany({
        where: { userId },
        take: 5,
        orderBy: { joinedAt: 'desc' },
        include: { room: { select: { id: true, name: true, language: true } } },
      }),
      this.getUserSuccessRate(userId),
    ]);

    return {
      totalExecutions,
      successRate,
      languageBreakdown: Object.fromEntries(
        byLanguage.map((b) => [b.language, b._count.language])
      ),
      recentRooms: recentRooms.map((m) => m.room),
    };
  }

  async getRoomAnalytics(roomId: string) {
    const [totalExecutions, byLanguage, totalUsers, recentHistory] = await Promise.all([
      prisma.executionHistory.count({ where: { roomId } }),
      prisma.executionHistory.groupBy({
        by: ['language', 'status'],
        where: { roomId },
        _count: true,
      }),
      prisma.roomMembership.count({ where: { roomId } }),
      prisma.executionHistory.findMany({
        where: { roomId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          language: true,
          status: true,
          executionTime: true,
          createdAt: true,
          user: { select: { username: true } },
        },
      }),
    ]);

    return {
      totalExecutions,
      totalUsers,
      languageStats: byLanguage,
      recentHistory,
    };
  }

  private async getUserSuccessRate(userId: string): Promise<number> {
    const [success, total] = await Promise.all([
      prisma.executionHistory.count({ where: { userId, status: 'completed' } }),
      prisma.executionHistory.count({ where: { userId } }),
    ]);
    return total > 0 ? Math.round((success / total) * 10000) / 100 : 0;
  }

  private async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      executionQueue.getWaitingCount(),
      executionQueue.getActiveCount(),
      executionQueue.getCompletedCount(),
      executionQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async recordDailyAnalytics(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEx, successEx, activeUsers, activeRooms, langCounts] = await Promise.all([
      prisma.executionHistory.count({ where: { createdAt: { gte: today } } }),
      prisma.executionHistory.count({ where: { createdAt: { gte: today }, status: 'completed' } }),
      prisma.user.count({ where: { lastLoginAt: { gte: today } } }),
      prisma.room.count({ where: { isActive: true, updatedAt: { gte: today } } }),
      prisma.executionHistory.groupBy({
        by: ['language'],
        where: { createdAt: { gte: today } },
        _count: true,
      }),
    ]);

    const avgTime = await prisma.executionHistory.aggregate({
      _avg: { executionTime: true },
      where: { createdAt: { gte: today }, status: 'completed' },
    });

    await prisma.analytics.upsert({
      where: { date: today },
      create: {
        date: today,
        totalExecutions: totalEx,
        successCount: successEx,
        failureCount: totalEx - successEx,
        avgExecutionTime: avgTime._avg.executionTime || 0,
        activeUsers,
        activeRooms,
        languageCounts: Object.fromEntries(langCounts.map((l) => [l.language, l._count])),
      },
      update: {
        totalExecutions: totalEx,
        successCount: successEx,
        failureCount: totalEx - successEx,
        avgExecutionTime: avgTime._avg.executionTime || 0,
        activeUsers,
        activeRooms,
        languageCounts: Object.fromEntries(langCounts.map((l) => [l.language, l._count])),
      },
    });
  }
}

export const analyticsService = new AnalyticsService();
