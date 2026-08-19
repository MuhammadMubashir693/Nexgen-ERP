import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  daysPerYear: z.coerce.number().int().min(0).max(365).default(0),
  isPaid: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updateLeaveTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    daysPerYear: z.coerce.number().int().min(0).max(365).optional(),
    isPaid: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const leaveTypeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const createLeaveRequestSchema = z
  .object({
    employeeId: z.string().uuid().optional(),
    leaveTypeId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "startDate must be in YYYY-MM-DD format",
    }),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "endDate must be in YYYY-MM-DD format",
    }),
    reason: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "endDate must be greater than or equal to startDate",
    path: ["endDate"],
  });

export const updateLeaveStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const leaveRequestIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const leaveListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
  leaveTypeId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leaveStatsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveStatusInput = z.infer<typeof updateLeaveStatusSchema>;
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;
export type LeaveStatsQuery = z.infer<typeof leaveStatsQuerySchema>;
