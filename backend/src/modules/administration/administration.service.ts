import { prisma } from "../../lib/prisma";
import type { ActivityLogListQuery } from "./administration.validation";

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function serializeActivityLog(record: any) {
  return {
    id: record.id,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    oldValues: record.oldValues,
    newValues: record.newValues,
    ipAddress: record.ipAddress,
    userAgent: record.userAgent,
    createdAt: record.createdAt.toISOString(),
    user: record.user
      ? {
          id: record.user.id,
          name: record.user.name,
          email: record.user.email,
          role: record.user.role,
        }
      : null, // null userId means the acting user was later deleted — see employee.service.ts hard-delete
  };
}

export async function listActivityLogs(query: ActivityLogListQuery) {
  const where: any = {};

  if (query.userId) {
    where.userId = query.userId;
  }

  if (query.action) {
    where.action = query.action;
  }

  if (query.entityType) {
    where.entityType = query.entityType;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = parseDateOnly(query.startDate);
    if (query.endDate) {
      const end = parseDateOnly(query.endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (query.search) {
    where.OR = [
      { entityType: { contains: query.search, mode: "insensitive" } },
      { user: { name: { contains: query.search, mode: "insensitive" } } },
      { user: { email: { contains: query.search, mode: "insensitive" } } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [records, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.activityLog.count({ where }),
  ]);

  return {
    logs: records.map(serializeActivityLog),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getActivityLogStats() {
  const since30Days = new Date();
  since30Days.setDate(since30Days.getDate() - 30);

  const [totalEvents, last30Days, distinctActionsRaw, distinctActors] = await Promise.all([
    prisma.activityLog.count(),
    prisma.activityLog.count({ where: { createdAt: { gte: since30Days } } }),
    prisma.activityLog.groupBy({
      by: ["action"],
      _count: { action: true },
    }),
    prisma.activityLog.findMany({
      where: { userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const actionBreakdown = distinctActionsRaw.map((row) => ({
    action: row.action,
    count: row._count.action,
  }));

  return {
    totalEvents,
    last30Days,
    distinctActors: distinctActors.length,
    actionBreakdown,
  };
}

// Also exposes system user counts for the Administration overview —
// distinct from activity logs, but lives in the same admin-only page.
export async function getUserManagementStats() {
  const [totalUsers, activeUsers, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    inactiveUsers: totalUsers - activeUsers,
    byRole: byRole.map((row) => ({ role: row.role, count: row._count.role })),
  };
}
