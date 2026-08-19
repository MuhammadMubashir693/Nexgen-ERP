import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  createTaskController,
  deleteTaskController,
  getTaskController,
  listTasksController,
  updateTaskController,
  updateTaskStatusController,
} from "./task.controller";

const router = Router();

router.use(authenticate);

router.get("/", listTasksController);
router.get("/:id", getTaskController);
router.post("/", createTaskController);
router.patch("/:id", updateTaskController);
router.patch("/:id/status", updateTaskStatusController);
router.delete("/:id", deleteTaskController);

export default router;
