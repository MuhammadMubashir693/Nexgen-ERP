import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => value == null || !Number.isNaN(Date.parse(value)), {
    message: "Invalid date",
  });

export const createEmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1).max(150),

  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  departmentId: z.string().uuid().optional().nullable(),

  employeeCode: z.string().trim().min(1).max(50),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  designation: z.string().trim().max(150).optional().nullable(),
  gender: z.string().trim().max(30).optional().nullable(),

  dateOfBirth: optionalDate,
  dateOfJoining: optionalDate,

  employmentType: z
    .enum(["full_time", "part_time", "contract"])
    .default("full_time"),

  basicSalary: z.coerce.number().min(0).max(999999999.99).default(0),

  managerId: z.string().uuid().optional().nullable(),
});

export const updateEmployeeSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().trim().min(1).max(150).optional(),

    role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
    departmentId: z.string().uuid().optional().nullable(),

    employeeCode: z.string().trim().min(1).max(50).optional(),
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(50).optional().nullable(),
    address: z.string().trim().max(500).optional().nullable(),
    designation: z.string().trim().max(150).optional().nullable(),
    gender: z.string().trim().max(30).optional().nullable(),

    dateOfBirth: optionalDate,
    dateOfJoining: optionalDate,

    employmentType: z
      .enum(["full_time", "part_time", "contract"])
      .optional(),

    basicSalary: z.coerce.number().min(0).max(999999999.99).optional(),

    managerId: z.string().uuid().optional().nullable(),
    status: z
      .enum(["active", "terminated", "resigned", "suspended"])
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const employeeIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const employeeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.string().uuid().optional(),
  role: z.enum(["ADMIN", "HR", "MANAGER", "EMPLOYEE"]).optional(),
  status: z
    .enum(["active", "terminated", "resigned", "suspended"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
