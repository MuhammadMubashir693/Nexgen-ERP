import { z } from "zod";

export const createLeadSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  company: z.string().trim().max(150).optional().nullable(),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).default("new"),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateLeadSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    company: z.string().trim().max(150).optional().nullable(),
    status: z.enum(["new", "contacted", "qualified", "won", "lost"]).optional(),
    assignedToId: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const updateLeadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().email(),
  phone: z.string().trim().max(50).optional().nullable(),
  billingAddress: z.string().trim().max(500).optional().nullable(),
  shippingAddress: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  assignedToId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().trim().max(50).optional().nullable(),
    billingAddress: z.string().trim().max(500).optional().nullable(),
    shippingAddress: z.string().trim().max(500).optional().nullable(),
    status: z.enum(["active", "inactive", "suspended"]).optional(),
    assignedToId: z.string().uuid().optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const crmIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const leadListQuerySchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "won", "lost", "all"]).optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const customerListQuerySchema = z.object({
  status: z.enum(["active", "inactive", "suspended", "all"]).optional(),
  assignedToId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
