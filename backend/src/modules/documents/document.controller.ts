import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  documentIdParamSchema,
  documentListQuerySchema,
  updateDocumentSchema,
} from "./document.validation";
import {
  deleteDocument,
  getDocumentById,
  getDocumentDownloadUrl,
  getDocumentStats,
  listDocuments,
  updateDocument,
  uploadDocument,
} from "./document.service";

export async function listDocumentsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = documentListQuerySchema.parse(req.query);
    const result = await listDocuments(req.user!, query);
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list documents";
    res.status(400).json({ success: false, message });
  }
}

export async function getDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const document = await getDocumentById(id);
    res.json({ success: true, document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get document";
    res.status(404).json({ success: false, message });
  }
}

export async function getDocumentDownloadController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const result = await getDocumentDownloadUrl(id);
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get download URL";
    res.status(404).json({ success: false, message });
  }
}

export async function uploadDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided for upload",
      });
    }

    const { fileName, relatedType, relatedId } = req.body;

    const document = await uploadDocument(req.user!, req.file, {
      fileName: fileName ? String(fileName) : undefined,
      relatedType: relatedType ? String(relatedType) : undefined,
      relatedId: relatedId ? String(relatedId) : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not upload document";
    res.status(400).json({ success: false, message });
  }
}

export async function updateDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const input = updateDocumentSchema.parse(req.body);
    const document = await updateDocument(id, input);
    res.json({ success: true, message: "Document updated successfully", document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update document";
    res.status(400).json({ success: false, message });
  }
}

export async function deleteDocumentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = documentIdParamSchema.parse(req.params);
    const result = await deleteDocument(id);
    res.json({ success: true, message: "Document deleted successfully", ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete document";
    res.status(400).json({ success: false, message });
  }
}

export async function getDocumentStatsController(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const stats = await getDocumentStats();
    res.json({ success: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load document statistics";
    res.status(500).json({ success: false, message });
  }
}
