import { z } from "zod";

export const notificationListQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.enum(["system", "task", "leave", "project"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
