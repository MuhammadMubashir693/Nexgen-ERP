import { z } from "zod";

export const activityLogListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.enum(["created", "updated", "deleted", "approved", "rejected", "login", "logout"]).optional(),
  entityType: z.string().trim().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ActivityLogListQuery = z.infer<typeof activityLogListQuerySchema>;
