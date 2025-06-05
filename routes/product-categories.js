// routes/product-categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/product_categories - used for dropdowns (no auth)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM product_categories ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Error loading product categories:", err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// POST /api/product-categories - protected
router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query(
      'INSERT INTO product_categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ message: "Error creating category" });
  }
});

module.exports = router;
