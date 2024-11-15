import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, checkSubscription } from '../middleware/authMiddleware.js';
import Subscription from '../models/subscriptionModel.js';
import { createNotification } from './notificationRoutes.js';

const router = express.Router();

// Apply protect and checkSubscription middleware to all routes
router.use(protect);
router.use(checkSubscription);

// Get current subscription
router.get('/current', asyncHandler(async (req, res) => {
  // Subscription is already attached to req by checkSubscription middleware
  if (!req.subscription) {
    // Create a basic subscription if none exists
    const newSubscription = await Subscription.create({
      userId: req.user._id,
      tier: 'basic'
    });
    return res.json(newSubscription);
  }

  res.json(req.subscription);
}));

// Rest of the routes remain the same...