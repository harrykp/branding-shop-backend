const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/hr
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.roles.includes('admin') || req.user.roles.includes('hr')) {
      const result = await db.query('SELECT * FROM hr');
      return res.json(result.rows);
    }

    // Regular employees: only their own HR record
    const result = await db.query('SELECT * FROM hr WHERE user_id = $1', [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error fetching HR records:", err);
    res.status(500).json({ message: "Error fetching HR records" });
  }
});

// POST /api/hr
router.post('/', authenticate, async (req, res) => {
  const { user_id, department, job_title, ssnit, insurance } = req.body;

  if (!req.user.roles.includes('admin') && !req.user.roles.includes('hr')) {
    return res.status(403).json({ message: "Only HR or Admin can create HR records" });
  }

  try {
    const result = await db.query(
      'INSERT INTO hr (user_id, department, job_title, ssnit, insurance) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, department, job_title, ssnit, insurance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating HR record:", err);
    res.status(500).json({ message: "Error saving HR record" });
  }
});

module.exports = router;
