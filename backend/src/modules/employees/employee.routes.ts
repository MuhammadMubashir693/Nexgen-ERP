import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorize } from "../../middleware/authorize";
import {
  createEmployeeController,
  deleteAvatarController,
  deleteEmployeeController,
  getEmployee,
  getEmployees,
  hardDeleteEmployeeController,
  updateEmployeeController,
  uploadAvatarController,
} from "./employee.controller";
import multer from "multer";

const router = Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/me/avatar",
  upload.single("avatar"),
  uploadAvatarController,
);

router.delete(
  "/me/avatar",
  deleteAvatarController,
);

// All authenticated users can access the employee directory.
// Service-level filtering prevents employees/managers from seeing
// records they should not see.
router.get("/", getEmployees);
router.get("/:id", getEmployee);

// Only ADMIN and HR can create/update employees.
// The service additionally prevents HR from creating/updating ADMIN roles.
router.post(
  "/",
  authorize("ADMIN", "HR"),
  createEmployeeController,
);

router.patch(
  "/:id",
  authorize("ADMIN", "HR"),
  updateEmployeeController,
);

// Only ADMIN can permanently delete an employee.
// This is intentionally separate from soft deactivation.
router.delete(
  "/:id/hard",
  authorize("ADMIN"),
  hardDeleteEmployeeController,
);

// Only ADMIN can deactivate an employee.
router.delete(
  "/:id",
  authorize("ADMIN"),
  deleteEmployeeController,
);

export default router;
