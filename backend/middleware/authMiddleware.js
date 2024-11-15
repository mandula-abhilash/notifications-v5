import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Subscription from '../models/subscriptionModel.js';
import { config } from '../config/config.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware to check subscription status
export const checkSubscription = asyncHandler(async (req, res, next) => {
  const subscription = await Subscription.findOne({ userId: req.user._id });
  
  if (subscription && subscription.tier === 'pro') {
    const now = new Date();
    if (now > new Date(subscription.expiryDate)) {
      // Downgrade to basic
      subscription.tier = 'basic';
      subscription.status = 'expired';
      await subscription.save();

      // Create notification about downgrade
      await createNotification(
        req.user._id,
        'Subscription Expired',
        'Your Pro subscription has expired. You have been downgraded to the Basic plan.',
        'warning'
      );
    }
  }

  // Add subscription to request object for route handlers
  req.subscription = subscription;
  next();
});