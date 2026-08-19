import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  attendanceIdParamSchema,
  attendanceListQuerySchema,
  attendanceStatsQuerySchema,
  bulkMarkAttendanceSchema,
  checkInSchema,
  checkOutSchema,
  manualAttendanceSchema,
  updateAttendanceSchema,
} from "./attendance.validation";
import {
  bulkMarkAttendance,
  checkIn,
  checkOut,
  deleteAttendanceRecord,
  getAttendanceStats,
  getTodayAttendance,
  listAttendance,
  recordManualAttendance,
  updateAttendanceRecord,
} from "./attendance.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";

  const status =
    message.includes("not found") || message.includes("Not found")
      ? 404
      : message.includes("permission") ||
        message.includes("Permission") ||
        message.includes("cannot") ||
        message.includes("Only HR") ||
        message.includes("Only Admin")
      ? 403
      : message.includes("already") ||
        message.includes("already checked in") ||
        message.includes("already checked out")
      ? 409
      : 400;

  return res.status(status).json({
    success: false,
    message,
  });
}

export async function getTodayAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const result = await getTodayAttendance(req.user!);
    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function checkInController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = checkInSchema.parse(req.body);
    const attendance = await checkIn(req.user!, input);

    return res.status(201).json({
      success: true,
      message: "Checked in successfully",
      attendance,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function checkOutController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = checkOutSchema.parse(req.body);
    const attendance = await checkOut(req.user!, input);

    return res.json({
      success: true,
      message: "Checked out successfully",
      attendance,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function recordManualAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = manualAttendanceSchema.parse(req.body);
    const attendance = await recordManualAttendance(req.user!, input);

    return res.status(201).json({
      success: true,
      message: "Attendance recorded successfully",
      attendance,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = attendanceIdParamSchema.parse(req.params);
    const input = updateAttendanceSchema.parse(req.body);
    const attendance = await updateAttendanceRecord(req.user!, id, input);

    return res.json({
      success: true,
      message: "Attendance updated successfully",
      attendance,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { id } = attendanceIdParamSchema.parse(req.params);
    const result = await deleteAttendanceRecord(req.user!, id);

    return res.json({
      success: true,
      message: "Attendance record deleted successfully",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = attendanceListQuerySchema.parse(req.query);
    const result = await listAttendance(req.user!, query);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getAttendanceStatsController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const query = attendanceStatsQuerySchema.parse(req.query);
    const stats = await getAttendanceStats(req.user!, query);

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function bulkMarkAttendanceController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const input = bulkMarkAttendanceSchema.parse(req.body);
    const result = await bulkMarkAttendance(req.user!, input);

    return res.json({
      success: true,
      message: `Marked attendance for ${result.count} employees`,
      count: result.count,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
