import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth";
import {
  notificationIdParamSchema,
  notificationListQuerySchema,
} from "./notification.validation";
import {
  deleteNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Internal server error";

  const status =
    message.includes("not found") || message.includes("Not found")
      ? 404
      : message.includes("permission") || message.includes("Permission")
      ? 403
      : 400;

  return res.status(status).json({
    success: false,
    message,
  });
}

export async function listNotificationsController(req: AuthenticatedRequest, res: Response) {
  try {
    const query = notificationListQuerySchema.parse(req.query);
    const result = await listNotifications(req.user!, query);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getUnreadCountController(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await getUnreadCount(req.user!);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function markNotificationReadController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = notificationIdParamSchema.parse(req.params);
    const notification = await markNotificationRead(req.user!, id);

    return res.json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function markAllNotificationsReadController(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await markAllNotificationsRead(req.user!);

    return res.json({
      success: true,
      message: `${result.updated} notification(s) marked as read`,
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function deleteNotificationController(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = notificationIdParamSchema.parse(req.params);
    const result = await deleteNotification(req.user!, id);

    return res.json({
      success: true,
      message: "Notification deleted",
      ...result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
