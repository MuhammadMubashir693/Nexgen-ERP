import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { getDashboardOverview } from "./dashboard.service";

export async function getDashboardOverviewController(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const data = await getDashboardOverview(req.user!);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load dashboard overview";
    res.status(500).json({ success: false, message });
  }
}
