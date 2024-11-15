import express from "express";
import asyncHandler from "express-async-handler";
import { protect } from "../middleware/authMiddleware.js";
import User from "../models/userModel.js";

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Get user profile
router.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    res.json(user);
  })
);

// Update user profile
router.put(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.name = req.body.name || user.name;
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400);
        throw new Error("Email already in use");
      }
      user.email = req.body.email;
      user.isVerified = false;
      // Handle email verification logic here
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isVerified: updatedUser.isVerified,
    });
  })
);

export default router;
