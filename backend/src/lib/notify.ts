import { prisma } from "./prisma";

export type NotificationType = "system" | "task" | "leave" | "project";

/**
 * Creates an in-app notification for a user. Best-effort: mirrors the
 * existing activityLog.create().catch(() => {}) pattern used in
 * documents/payroll — a failed notification should never break the
 * action that triggered it (e.g. approving a leave request should still
 * succeed even if the notification insert fails).
 */
export async function notify(params: {
  userId: string;
  title: string;
  message?: string;
  type?: NotificationType;
}) {
  await prisma.notification
    .create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type ?? "system",
      },
    })
    .catch(() => { });
}

/**
 * Same as notify(), but for many recipients at once (e.g. notifying every
 * member of a department). Skips falsy/duplicate userIds automatically.
 */
export async function notifyMany(params: {
  userIds: (string | null | undefined)[];
  title: string;
  message?: string;
  type?: NotificationType;
}) {
  const uniqueIds = [...new Set(params.userIds.filter((id): id is string => !!id))];
  if (uniqueIds.length === 0) return;

  await prisma.notification
    .createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        title: params.title,
        message: params.message,
        type: params.type ?? "system",
      })),
    })
    .catch(() => { });
}

/**
 * Writes an activity log entry. Extracted from the existing inline
 * pattern in documents/payroll so every module can log consistently.
 * Always best-effort — logging failures must never break the caller.
 */
export async function logActivity(params: {
  userId?: string | null;
  action: "created" | "updated" | "deleted" | "approved" | "rejected" | "login" | "logout";
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}) {
  await prisma.activityLog
    .create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        oldValues: params.oldValues as any ?? undefined,   // 👈 cast to any
        newValues: params.newValues as any ?? undefined,   // 👈 cast to any
      },
    })
    .catch(() => { });
}
