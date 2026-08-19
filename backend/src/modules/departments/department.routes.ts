import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  createDepartmentController,
  deleteDepartmentController,
  getDepartment,
  getDepartments,
  updateDepartmentController,
} from "./department.controller";

const router = Router();

router.use(authenticate);

router.get("/", getDepartments);
router.get("/:id", getDepartment);

router.post("/", authorize("ADMIN", "HR"), createDepartmentController);
router.patch("/:id", authorize("ADMIN", "HR"), updateDepartmentController);
router.delete("/:id", authorize("ADMIN"), deleteDepartmentController);

export default router;
