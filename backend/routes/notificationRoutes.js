import express from "express";
import asyncHandler from "express-async-handler";
import { protect, checkSubscription } from "../middleware/authMiddleware.js";
import Notification from "../models/notificationModel.js";
import { publishToQueue } from "../config/rabbitmq.js";

const router = express.Router();

router.use(protect);
router.use(checkSubscription);

// Get all notifications for the authenticated user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = req.subscription?.tier === "pro" ? 100 : 50;
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(notifications);
  })
);

// Mark notification as read
router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      res.status(404);
      throw new Error("Notification not found");
    }

    res.json(notification);
  })
);

// Mark all notifications as read
router.post(
  "/mark-all-read",
  asyncHandler(async (req, res) => {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.json({ message: "All notifications marked as read" });
  })
);

// Create a notification (internal use)
export const createNotification = async (
  userId,
  title,
  message,
  type = "info"
) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
  });

  await publishToQueue("notifications", {
    type: "new_notification",
    notification,
  });

  return notification;
};

export default router;
