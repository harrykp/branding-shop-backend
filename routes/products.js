const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/products (open to all)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE sellable = true ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Products fetch error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// POST, PUT, DELETE restricted to admin
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: "Admin access required" });
  // placeholder logic for product creation
  res.status(200).json({ message: "Create product logic here" });
});

router.put('/:id', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: "Admin access required" });
  // placeholder logic for product update
  res.status(200).json({ message: "Update product logic here" });
});

router.delete('/:id', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) return res.status(403).json({ message: "Admin access required" });
  // placeholder logic for product deletion
  res.status(200).json({ message: "Delete product logic here" });
});

module.exports = router;
