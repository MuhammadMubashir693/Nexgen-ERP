import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  getProjectsStatsController,
  listProjectsController,
  updateProjectController,
} from "./project.controller";

const router = Router();

router.use(authenticate);

router.get("/stats", getProjectsStatsController);
router.get("/", listProjectsController);
router.get("/:id", getProjectController);

router.post("/", authorize("ADMIN", "HR", "MANAGER"), createProjectController);
router.patch("/:id", authorize("ADMIN", "HR", "MANAGER"), updateProjectController);
router.delete("/:id", authorize("ADMIN"), deleteProjectController);

export default router;
