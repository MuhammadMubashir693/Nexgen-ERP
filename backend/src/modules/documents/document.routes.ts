import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../middleware/auth";
import {
  deleteDocumentController,
  getDocumentController,
  getDocumentDownloadController,
  getDocumentStatsController,
  listDocumentsController,
  updateDocumentController,
  uploadDocumentController,
} from "./document.controller";

const router = Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max
  },
});

router.get("/stats", getDocumentStatsController);
router.get("/", listDocumentsController);
router.post("/upload", upload.single("file"), uploadDocumentController);
router.get("/:id", getDocumentController);
router.get("/:id/download", getDocumentDownloadController);
router.patch("/:id", updateDocumentController);
router.delete("/:id", deleteDocumentController);

export default router;
