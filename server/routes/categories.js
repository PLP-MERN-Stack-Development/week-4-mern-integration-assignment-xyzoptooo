// server/routes/categories.js - Routes for blog categories API

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/auth');

// GET /api/categories - Get all categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories - Create a new category
router.post(
  '/',
  authMiddleware,
  [body('name').notEmpty().withMessage('Category name is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const existing = await Category.findOne({ name: req.body.name });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Category already exists' });
      }
      const category = new Category({ name: req.body.name });
      await category.save();
      res.status(201).json({ success: true, data: category });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
