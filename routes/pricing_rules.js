const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/pricing-rules
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM pricing_rules ORDER BY product_id');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pricing rules:", err);
    res.status(500).json({ message: "Error loading pricing rules" });
  }
});

// POST /api/pricing-rules
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { product_id, min_qty, max_qty, price_per_unit } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO pricing_rules (product_id, min_qty, max_qty, price_per_unit) VALUES ($1, $2, $3, $4) RETURNING *',
      [product_id, min_qty, max_qty, price_per_unit]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating pricing rule:", err);
    res.status(500).json({ message: "Error creating pricing rule" });
  }
});

module.exports = router;
