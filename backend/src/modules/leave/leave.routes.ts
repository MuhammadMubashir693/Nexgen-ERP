import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  cancelLeaveRequestController,
  createLeaveRequestController,
  createLeaveTypeController,
  getLeaveStatsController,
  listLeaveRequestsController,
  listLeaveTypesController,
  updateLeaveStatusController,
  updateLeaveTypeController,
} from "./leave.controller";

const router = Router();

router.use(authenticate);

// Leave Types
router.get("/types", listLeaveTypesController);
router.post("/types", authorize("ADMIN", "HR"), createLeaveTypeController);
router.patch("/types/:id", authorize("ADMIN", "HR"), updateLeaveTypeController);

// Leave Stats
router.get("/stats", getLeaveStatsController);

// Leave Requests
router.get("/", listLeaveRequestsController);
router.post("/", createLeaveRequestController);
router.patch(
  "/:id/status",
  authorize("ADMIN", "HR", "MANAGER"),
  updateLeaveStatusController,
);
router.delete("/:id", cancelLeaveRequestController);

export default router;
