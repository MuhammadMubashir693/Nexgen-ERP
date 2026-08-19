import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  getActivityLogStatsController,
  getUserManagementStatsController,
  listActivityLogsController,
} from "./administration.controller";

const router = Router();

router.use(authenticate);

// Administration is ADMIN-only — activity logs and system-level stats
// are sensitive across every module, so no HR/Manager carve-out here
// (unlike e.g. leave approvals, which HR/Manager can also see).
router.use(authorize("ADMIN"));

router.get("/activity-log", listActivityLogsController);
router.get("/activity-log/stats", getActivityLogStatsController);
router.get("/users/stats", getUserManagementStatsController);

export default router;
