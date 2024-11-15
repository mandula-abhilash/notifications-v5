import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, checkSubscription } from '../middleware/authMiddleware.js';
import Notification from '../models/notificationModel.js';
import { publishToQueue } from '../config/rabbitmq.js';

const router = express.Router();

// Apply protect and checkSubscription middleware to all routes
router.use(protect);
router.use(checkSubscription);

// Get all notifications for the authenticated user
router.get('/', asyncHandler(async (req, res) => {
  const limit = req.subscription?.tier === 'pro' ? 100 : 50; // Pro users get more notifications
  const notifications = await Notification.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json(notifications);
}));

// Rest of the routes remain the same...