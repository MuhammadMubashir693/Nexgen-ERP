import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  bulkMarkAttendanceController,
  checkInController,
  checkOutController,
  deleteAttendanceController,
  getAttendanceStatsController,
  getTodayAttendanceController,
  listAttendanceController,
  recordManualAttendanceController,
  updateAttendanceController,
} from "./attendance.controller";

const router = Router();

router.use(authenticate);

// Current user punch operations
router.get("/today", getTodayAttendanceController);
router.post("/check-in", checkInController);
router.post("/check-out", checkOutController);

// Statistics and listing (scoped inside service)
router.get("/stats", getAttendanceStatsController);
router.get("/", listAttendanceController);

// HR and Admin operations
router.post(
  "/manual",
  authorize("ADMIN", "HR"),
  recordManualAttendanceController,
);

router.post(
  "/bulk",
  authorize("ADMIN", "HR"),
  bulkMarkAttendanceController,
);

router.patch(
  "/:id",
  authorize("ADMIN", "HR"),
  updateAttendanceController,
);

router.delete(
  "/:id",
  authorize("ADMIN", "HR"),
  deleteAttendanceController,
);

export default router;
