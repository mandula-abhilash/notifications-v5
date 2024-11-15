import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import { config } from '../config/config.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

// Generate tokens
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: '24h'
  });
};

const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Register user
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const verificationToken = generateVerificationToken();
  const user = await User.create({
    name,
    email,
    password,
    verificationToken,
    verificationTokenExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  });

  await sendVerificationEmail(email, verificationToken);

  res.status(201).json({
    message: 'Registration successful. Please check your email to verify your account.'
  });
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired verification token');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({ message: 'Email verified successfully' });
});

// Login user
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  if (!user.isVerified) {
    res.status(401);
    throw new Error('Please verify your email before logging in');
  }

  user.lastLogin = Date.now();
  await user.save();

  const token = generateToken(user._id);

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified
    }
  });
});