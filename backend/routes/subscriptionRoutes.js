import express from "express";
import asyncHandler from "express-async-handler";
import { protect, checkSubscription } from "../middleware/authMiddleware.js";
import Subscription from "../models/subscriptionModel.js";
import { createNotification } from "./notificationRoutes.js";

const router = express.Router();

router.use(protect);
router.use(checkSubscription);

// Get current subscription
router.get(
  "/current",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      const newSubscription = await Subscription.create({
        userId: req.user._id,
        tier: "basic",
      });
      return res.json(newSubscription);
    }
    res.json(req.subscription);
  })
);

// Upgrade to pro
router.post(
  "/upgrade",
  asyncHandler(async (req, res) => {
    const subscription =
      req.subscription ||
      (await Subscription.create({
        userId: req.user._id,
        tier: "basic",
      }));

    if (subscription.tier === "pro") {
      res.status(400);
      throw new Error("Already on pro tier");
    }

    subscription.tier = "pro";
    subscription.startDate = new Date();
    subscription.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    subscription.status = "active";
    await subscription.save();

    await createNotification(
      req.user._id,
      "Subscription Upgraded",
      "Welcome to Pro! Enjoy enhanced features and higher limits.",
      "success"
    );

    res.json(subscription);
  })
);

// Cancel subscription
router.post(
  "/cancel",
  asyncHandler(async (req, res) => {
    if (!req.subscription) {
      res.status(404);
      throw new Error("No active subscription found");
    }

    req.subscription.status = "cancelled";
    req.subscription.cancelledAt = new Date();
    await req.subscription.save();

    await createNotification(
      req.user._id,
      "Subscription Cancelled",
      "Your pro subscription has been cancelled. You will be moved to the basic plan at the end of your billing period.",
      "info"
    );

    res.json(req.subscription);
  })
);

export default router;
