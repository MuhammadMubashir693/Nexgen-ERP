import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  deleteNotificationController,
  getUnreadCountController,
  listNotificationsController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "./notification.controller";

const router = Router();

router.use(authenticate);

// All routes are implicitly scoped to req.user.id in the service layer —
// no role checks needed, a user can only ever see/modify their own notifications.
router.get("/", listNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.patch("/read-all", markAllNotificationsReadController);
router.patch("/:id/read", markNotificationReadController);
router.delete("/:id", deleteNotificationController);

export default router;
