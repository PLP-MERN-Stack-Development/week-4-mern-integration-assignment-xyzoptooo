// server/routes/posts.js - Routes for blog posts API

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

// GET /api/posts - Get all posts with optional pagination and filtering
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;

    const filter = {};
    if (category) {
      filter.category = category;
    }

    const posts = await Post.find(filter)
      .populate('author', 'username')
      .populate('category', 'name')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments(filter);

    res.json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id - Get a single post by ID or slug
router.get('/:id', async (req, res, next) => {
  try {
    const idOrSlug = req.params.id;
    let post;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      post = await Post.findById(idOrSlug)
        .populate('author', 'username')
        .populate('category', 'name');
    } else {
      post = await Post.findOne({ slug: idOrSlug })
        .populate('author', 'username')
        .populate('category', 'name');
    }
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    res.json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts - Create a new post
router.post(
  '/',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 100 }),
    body('content').notEmpty().withMessage('Content is required'),
    body('category').notEmpty().withMessage('Category is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      const postData = {
        title: req.body.title,
        content: req.body.content,
        category: req.body.category,
        author: req.user.id,
        featuredImage: req.body.featuredImage || 'default-post.jpg',
        excerpt: req.body.excerpt || '',
        tags: req.body.tags || [],
        isPublished: req.body.isPublished || false,
      };
      const post = new Post(postData);
      await post.save();
      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/posts/:id - Update an existing post
router.put(
  '/:id',
  authMiddleware,
  [
    body('title').optional().isLength({ max: 100 }),
    body('content').optional(),
    body('category').optional(),
  ],
  async (req, res, next) => {
    try {
      const postId = req.params.id;
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      if (post.author.toString() !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      Object.assign(post, req.body);
      await post.save();
      res.json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/posts/:id - Delete a post
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    await post.remove();
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/posts/:id/comments - Add a comment to a post
router.post(
  '/:id/comments',
  authMiddleware,
  [body('content').notEmpty().withMessage('Comment content is required')],
  async (req, res, next) => {
    try {
      const postId = req.params.id;
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ success: false, error: 'Post not found' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      post.comments.push({ user: req.user.id, content: req.body.content });
      await post.save();
      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
