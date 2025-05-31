const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/roles
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query('SELECT * FROM roles ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Failed to load roles" });
  }
});

module.exports = router;
