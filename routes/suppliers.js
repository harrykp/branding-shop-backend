const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin') && !req.user.roles.includes('sales')) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ message: "Error fetching suppliers" });
  }
});

// POST /api/suppliers
router.post('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const { name, email, phone } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO suppliers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating supplier:", err);
    res.status(500).json({ message: "Error saving supplier" });
  }
});

module.exports = router;
