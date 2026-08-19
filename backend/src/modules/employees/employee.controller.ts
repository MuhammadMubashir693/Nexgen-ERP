import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  createEmployeeSchema,
  employeeIdParamSchema,
  employeeListQuerySchema,
  updateEmployeeSchema,
} from "./employee.validation";
import {
  createEmployee,
  deactivateEmployee,
  deleteAvatar,
  getEmployeeById,
  hardDeleteEmployee,
  listEmployees,
  updateEmployee,
  uploadAvatar,
} from "./employee.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";

  const status =
    message.includes("not found") ||
      message.includes("Not found")
      ? 404
      : message.includes("permission") ||
        message.includes("Permission") ||
        message.includes("cannot")
        ? 403
        : message.includes("already exists") ||
          message.includes("already in use") ||
          message.includes("inactive") ||
          message.includes("not a manager")
          ? 409
          : 400;

  return res.status(status).json({
    success: false,
    message,
  });
}

export async function getEmployees(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = employeeListQuerySchema.parse(req.query);
    const result = await listEmployees(req.user!, query);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getEmployee(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const employee = await getEmployeeById(id, req.user!);

    return res.json({
      success: true,
      employee,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createEmployeeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createEmployeeSchema.parse(req.body);
    const employee = await createEmployee(req.user!, input);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateEmployeeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const input = updateEmployeeSchema.parse(req.body);

    const employee = await updateEmployee(req.user!, id, input);

    return res.json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteEmployeeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const result = await deactivateEmployee(req.user!, id);

    return res.json({
      success: true,
      message: "Employee deactivated successfully",
      employee: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}


export async function hardDeleteEmployeeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = employeeIdParamSchema.parse(req.params);
    const result = await hardDeleteEmployee(req.user!, id);

    return res.json({
      success: true,
      message: result.authDeleted
        ? "Employee permanently deleted successfully"
        : "Employee permanently deleted from the ERP database, but the Supabase Auth account could not be deleted",
      employee: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function uploadAvatarController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar image is required",
      });
    }

    const result = await uploadAvatar(req.user!, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    return res.json({
      success: true,
      message: "Avatar uploaded successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteAvatarController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const result = await deleteAvatar(req.user!);

    return res.json({
      success: true,
      message: "Avatar removed successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
