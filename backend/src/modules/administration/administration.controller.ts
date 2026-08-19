import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { activityLogListQuerySchema } from "./administration.validation";
import {
  getActivityLogStats,
  getUserManagementStats,
  listActivityLogs,
} from "./administration.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(400).json({ success: false, message });
}

export async function listActivityLogsController(req: AuthenticatedRequest, res: Response) {
  try {
    const query = activityLogListQuerySchema.parse(req.query);
    const result = await listActivityLogs(query);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getActivityLogStatsController(_req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await getActivityLogStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getUserManagementStatsController(_req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await getUserManagementStats();

    return res.json({
      success: true,
      stats,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
