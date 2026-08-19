import { prisma } from "../../lib/prisma";
import type { NotificationListQuery } from "./notification.validation";

type RequestingUser = {
  id: string;
};

function serializeNotification(record: {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: Date;
}) {
  return {
    id: record.id,
    title: record.title,
    message: record.message,
    type: record.type,
    isRead: record.isRead,
    createdAt: record.createdAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// Every notification is scoped to req.user.id — there is no
// cross-user access here, unlike leave/employees which have
// role-based scoping. A user only ever sees their own notifications.
// ─────────────────────────────────────────────────────────────

export async function listNotifications(user: RequestingUser, query: NotificationListQuery) {
  const where: any = { userId: user.id };

  if (query.isRead !== undefined) {
    where.isRead = query.isRead;
  }

  if (query.type) {
    where.type = query.type;
  }

  const skip = (query.page - 1) * query.limit;

  const [records, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);

  return {
    notifications: records.map(serializeNotification),
    unreadCount,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getUnreadCount(user: RequestingUser) {
  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });
  return { unreadCount };
}

export async function markNotificationRead(user: RequestingUser, id: string) {
  const existing = await prisma.notification.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Notification not found");
  }

  if (existing.userId !== user.id) {
    throw new Error("You do not have permission to modify this notification");
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return serializeNotification(updated);
}

export async function markAllNotificationsRead(user: RequestingUser) {
  const result = await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return { updated: result.count };
}

export async function deleteNotification(user: RequestingUser, id: string) {
  const existing = await prisma.notification.findUnique({ where: { id } });

  if (!existing) {
    throw new Error("Notification not found");
  }

  if (existing.userId !== user.id) {
    throw new Error("You do not have permission to delete this notification");
  }

  await prisma.notification.delete({ where: { id } });

  return { id, deleted: true };
}
