import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  createLeaveRequestSchema,
  createLeaveTypeSchema,
  leaveListQuerySchema,
  leaveRequestIdParamSchema,
  leaveStatsQuerySchema,
  leaveTypeIdParamSchema,
  updateLeaveStatusSchema,
  updateLeaveTypeSchema,
} from "./leave.validation";
import {
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  getLeaveStats,
  listLeaveRequests,
  listLeaveTypes,
  updateLeaveStatus,
  updateLeaveType,
} from "./leave.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";

  const status =
    message.includes("not found") || message.includes("Not found")
      ? 404
      : message.includes("permission") ||
        message.includes("Permission") ||
        message.includes("cannot") ||
        message.includes("Only HR") ||
        message.includes("Only Admin") ||
        message.includes("Only Managers")
      ? 403
      : message.includes("already") || message.includes("exists")
      ? 409
      : 400;

  return res.status(status).json({
    success: false,
    message,
  });
}

// ─────────────────────────────────────────────────────────────
// LEAVE TYPES CONTROLLERS
// ─────────────────────────────────────────────────────────────

export async function listLeaveTypesController(
  _req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const types = await listLeaveTypes();
    return res.json({
      success: true,
      leaveTypes: types,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createLeaveTypeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createLeaveTypeSchema.parse(req.body);
    const leaveType = await createLeaveType(req.user!, input);

    return res.status(201).json({
      success: true,
      message: "Leave type created successfully",
      leaveType,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateLeaveTypeController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = leaveTypeIdParamSchema.parse(req.params);
    const input = updateLeaveTypeSchema.parse(req.body);
    const leaveType = await updateLeaveType(req.user!, id, input);

    return res.json({
      success: true,
      message: "Leave type updated successfully",
      leaveType,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

// ─────────────────────────────────────────────────────────────
// LEAVE REQUESTS CONTROLLERS
// ─────────────────────────────────────────────────────────────

export async function listLeaveRequestsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = leaveListQuerySchema.parse(req.query);
    const result = await listLeaveRequests(req.user!, query);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createLeaveRequestController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = createLeaveRequestSchema.parse(req.body);
    const leaveRequest = await createLeaveRequest(req.user!, input);

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateLeaveStatusController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = leaveRequestIdParamSchema.parse(req.params);
    const input = updateLeaveStatusSchema.parse(req.body);
    const leaveRequest = await updateLeaveStatus(req.user!, id, input);

    return res.json({
      success: true,
      message: `Leave request ${input.status} successfully`,
      leaveRequest,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function cancelLeaveRequestController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = leaveRequestIdParamSchema.parse(req.params);
    const result = await cancelLeaveRequest(req.user!, id);

    return res.json({
      success: true,
      message: "Leave request cancelled successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getLeaveStatsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = leaveStatsQuerySchema.parse(req.query);
    const stats = await getLeaveStats(req.user!, query);

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
