// server/routes/auth.js - Routes for user authentication

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// POST /api/auth/register - Register a new user
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required').isLength({ min: 3, max: 30 }),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { username, email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, error: 'Email already in use' });
      }
      const user = new User({ username, email, password });
      await user.save();
      const token = generateToken(user);
      res.status(201).json({ success: true, data: { user: { id: user._id, username, email }, token } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login - Login user
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      const token = generateToken(user);
      res.json({ success: true, data: { user: { id: user._id, username: user.username, email }, token } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
