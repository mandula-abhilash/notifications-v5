import express from "express";
import { register, login, verifyEmail } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmail);

// Protected routes
router.post("/logout", protect, (req, res) => {
  res.json({ message: "Logged out successfully" });
});

router.get("/me", protect, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    isVerified: req.user.isVerified,
  });
});

export default router;
