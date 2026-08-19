import { prisma } from "../../lib/prisma";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import type { DocumentListQuery, UpdateDocumentInput } from "./document.validation";

const DOCUMENTS_BUCKET = "documents";

type RequestingUser = {
  id: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE" | string;
};

const documentInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      employee: {
        select: {
          avatarUrl: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} as const;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function serializeDocument(doc: any, signedUrl?: string | null) {
  return {
    id: doc.id,
    fileName: doc.fileName,
    fileUrl: doc.fileUrl,
    downloadUrl: signedUrl || null,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize != null ? Number(doc.fileSize) : 0,
    relatedType: doc.relatedType || "general",
    relatedId: doc.relatedId,
    uploadedAt: doc.uploadedAt ? doc.uploadedAt.toISOString() : null,
    owner: doc.owner
      ? {
        id: doc.owner.id,
        name: doc.owner.name,
        email: doc.owner.email,
        role: doc.owner.role,
        avatarUrl: doc.owner.employee?.avatarUrl || null,
      }
      : null,
  };
}

export async function uploadDocument(
  user: RequestingUser,
  file: Express.Multer.File,
  metadata: {
    fileName?: string;
    relatedType?: string;
    relatedId?: string;
  },
) {
  const originalName = metadata.fileName?.trim() || file.originalname;
  const safeName = sanitizeFileName(originalName);
  const storagePath = `${user.id}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase storage upload error:", uploadError);
    throw new Error(`Could not upload file to storage: ${uploadError.message}`);
  }

  const doc = await prisma.document.create({
    data: {
      ownerId: user.id,
      fileName: originalName,
      fileUrl: storagePath,
      mimeType: file.mimetype,
      fileSize: BigInt(file.size),
      relatedType: metadata.relatedType || "general",
      relatedId: metadata.relatedId || null,
    },
    include: documentInclude,
  });

  const { data: signedData } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  // Log in activity log
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "created",
      entityType: "document",
      entityId: doc.id,
      newValues: {
        fileName: doc.fileName,
        relatedType: doc.relatedType,
        fileSize: Number(doc.fileSize),
      },
    },
  }).catch(() => { });

  return serializeDocument(doc, signedData?.signedUrl);
}

export async function listDocuments(user: RequestingUser, query: DocumentListQuery) {
  const where: any = {};

  if (query.relatedType && query.relatedType !== "all") {
    where.relatedType = query.relatedType;
  }

  if (query.relatedId) {
    where.relatedId = query.relatedId;
  }

  if (query.ownerId) {
    where.ownerId = query.ownerId;
  }

  if (query.search) {
    where.OR = [
      { fileName: { contains: query.search, mode: "insensitive" } },
      { relatedType: { contains: query.search, mode: "insensitive" } },
    ];
  }

  // Scoping: Employees see their own docs, or company policies/general docs
  if (user.role === "EMPLOYEE") {
    where.OR = [
      { ownerId: user.id },
      { relatedType: "policy" },
      { relatedType: "general" },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: documentInclude,
      orderBy: { uploadedAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents: docs.map((d) => serializeDocument(d)),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getDocumentById(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: documentInclude,
  });

  if (!doc) {
    throw new Error("Document not found");
  }

  const { data: signedData } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.fileUrl, 3600);

  return serializeDocument(doc, signedData?.signedUrl);
}

export async function getDocumentDownloadUrl(id: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new Error("Document not found");

  const { data, error } = await supabaseAdmin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(doc.fileUrl, 3600, { download: doc.fileName });

  if (error || !data?.signedUrl) {
    throw new Error(`Could not generate signed download URL: ${error?.message || "Unknown"}`);
  }

  return {
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    downloadUrl: data.signedUrl,
  };
}

export async function updateDocument(id: string, input: UpdateDocumentInput) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new Error("Document not found");

  const updated = await prisma.document.update({
    where: { id },
    data: {
      fileName: input.fileName,
      relatedType: input.relatedType !== undefined ? input.relatedType : undefined,
      relatedId: input.relatedId !== undefined ? input.relatedId : undefined,
    },
    include: documentInclude,
  });

  return serializeDocument(updated);
}

export async function deleteDocument(id: string) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) throw new Error("Document not found");

  // Remove from storage bucket
  await supabaseAdmin.storage.from(DOCUMENTS_BUCKET).remove([existing.fileUrl]);

  // Remove from database
  await prisma.document.delete({ where: { id } });

  return { id, deleted: true };
}

export async function getDocumentStats() {
  const docs = await prisma.document.findMany({
    select: {
      id: true,
      fileSize: true,
      mimeType: true,
      relatedType: true,
    },
  });

  let totalSize = 0;
  const categories: Record<string, { count: number; size: number }> = {};
  const fileTypes: Record<string, { count: number; size: number }> = {};

  for (const doc of docs) {
    const size = doc.fileSize != null ? Number(doc.fileSize) : 0;
    totalSize += size;

    const cat = doc.relatedType || "general";
    if (!categories[cat]) categories[cat] = { count: 0, size: 0 };
    categories[cat].count++;
    categories[cat].size += size;

    let typeCategory = "other";
    const mime = doc.mimeType || "";
    if (mime.includes("pdf")) typeCategory = "pdf";
    else if (mime.includes("image")) typeCategory = "image";
    else if (mime.includes("word") || mime.includes("document") || mime.includes("text")) typeCategory = "document";
    else if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) typeCategory = "spreadsheet";

    if (!fileTypes[typeCategory]) fileTypes[typeCategory] = { count: 0, size: 0 };
    fileTypes[typeCategory].count++;
    fileTypes[typeCategory].size += size;
  }

  return {
    totalDocuments: docs.length,
    totalSizeBytes: totalSize,
    categories: Object.entries(categories).map(([name, data]) => ({
      category: name,
      count: data.count,
      sizeBytes: data.size,
    })),
    fileTypes: Object.entries(fileTypes).map(([type, data]) => ({
      type,
      count: data.count,
      sizeBytes: data.size,
    })),
  };
}
