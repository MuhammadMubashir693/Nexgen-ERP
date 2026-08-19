import { z } from "zod";

export const documentListQuerySchema = z.object({
  relatedType: z.string().trim().optional(),
  relatedId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const updateDocumentSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255).optional(),
    relatedType: z.string().trim().max(50).optional().nullable(),
    relatedId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const documentIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
