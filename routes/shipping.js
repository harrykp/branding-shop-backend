const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/shipping
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('fulfillment')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM shipping ORDER BY ship_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching shipping records:", err);
    res.status(500).json({ message: "Error fetching shipping records" });
  }
});

// POST /api/shipping
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('fulfillment')) {
    return res.status(403).json({ message: "Access denied" });
  }

  const { order_id, tracking_number, carrier, ship_date, notes } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO shipping (order_id, tracking_number, carrier, ship_date, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [order_id, tracking_number, carrier, ship_date, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error saving shipping record:", err);
    res.status(500).json({ message: "Error saving shipping record" });
  }
});

module.exports = router;
