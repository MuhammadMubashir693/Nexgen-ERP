import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  createDepartmentSchema,
  departmentIdParamSchema,
  departmentListQuerySchema,
  updateDepartmentSchema,
} from "./department.validation";
import {
  createDepartment,
  deactivateDepartment,
  getDepartmentById,
  listDepartments,
  updateDepartment,
} from "./department.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";

  const status =
    message.toLowerCase().includes("not found") ? 404 :
    message.toLowerCase().includes("permission") ? 403 :
    message.toLowerCase().includes("already") ||
    message.toLowerCase().includes("inactive") ||
    message.toLowerCase().includes("not a manager") ? 409 : 400;

  return res.status(status).json({ success: false, message });
}

export async function getDepartments(req: AuthenticatedRequest, res: Response) {
  try {
    const query = departmentListQuerySchema.parse(req.query);
    return res.json({ success: true, ...(await listDepartments(req.user!, query)) });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getDepartment(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = departmentIdParamSchema.parse(req.params);
    return res.json({
      success: true,
      department: await getDepartmentById(id, req.user!),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createDepartmentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createDepartmentSchema.parse(req.body);
    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department: await createDepartment(req.user!, input),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateDepartmentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = departmentIdParamSchema.parse(req.params);
    const input = updateDepartmentSchema.parse(req.body);
    return res.json({
      success: true,
      message: "Department updated successfully",
      department: await updateDepartment(req.user!, id, input),
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteDepartmentController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = departmentIdParamSchema.parse(req.params);
    return res.json({
      success: true,
      message: "Department deactivated successfully",
      department: await deactivateDepartment(req.user!, id),
    });
  } catch (error) {
    return handleError(res, error);
  }
}
