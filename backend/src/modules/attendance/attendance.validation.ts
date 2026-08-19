import { z } from "zod";

export const checkInSchema = z.object({
  employeeId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  timestamp: z.string().datetime().optional(),
});

export const checkOutSchema = z.object({
  employeeId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional().nullable(),
  timestamp: z.string().datetime().optional(),
});

export const manualAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Date must be in YYYY-MM-DD format",
  }),
  checkIn: z.string().datetime().optional().nullable(),
  checkOut: z.string().datetime().optional().nullable(),
  workHours: z.coerce.number().min(0).max(24).optional().nullable(),
  status: z.enum(["present", "absent", "late", "half_day", "leave"]).default("present"),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateAttendanceSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Date must be in YYYY-MM-DD format",
    }).optional(),
    checkIn: z.string().datetime().optional().nullable(),
    checkOut: z.string().datetime().optional().nullable(),
    workHours: z.coerce.number().min(0).max(24).optional().nullable(),
    status: z.enum(["present", "absent", "late", "half_day", "leave"]).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const attendanceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const attendanceListQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employeeId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.enum(["present", "absent", "late", "half_day", "leave", "all"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const attendanceStatsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  departmentId: z.string().uuid().optional(),
});

export const bulkMarkAttendanceSchema = z.object({
  records: z.array(
    z.object({
      employeeId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      status: z.enum(["present", "absent", "late", "half_day", "leave"]),
      notes: z.string().trim().max(500).optional().nullable(),
    })
  ).min(1, "At least one record is required"),
});

export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type AttendanceStatsQuery = z.infer<typeof attendanceStatsQuerySchema>;
export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;
