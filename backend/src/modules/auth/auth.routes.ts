import { Router } from "express";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../../middleware/auth";
import {
  changeUserPassword,
  getCurrentUserProfile,
  updateUserProfile,
} from "./auth.service";

const router = Router();

router.get(
  "/me",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const profile = await getCurrentUserProfile(req.user!.id);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: "User profile not found",
        });
      }

      res.json({
        success: true,
        user: profile,
      });
    } catch (error) {
      console.error("Could not load user profile:", error);
      res.status(500).json({
        success: false,
        message: "Could not load user profile",
      });
    }
  },
);

router.patch(
  "/profile",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const updated = await updateUserProfile(req.user!.id, req.body);
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: updated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update profile";
      res.status(400).json({
        success: false,
        message,
      });
    }
  },
);

router.post(
  "/change-password",
  authenticate,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { newPassword } = req.body;
      const result = await changeUserPassword(req.user!.id, newPassword);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not change password";
      res.status(400).json({
        success: false,
        message,
      });
    }
  },
);

export default router;