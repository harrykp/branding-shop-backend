const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/catalog
router.get('/', authenticate, async (req, res) => {
  const allowedRoles = ['admin', 'sales', 'purchasing', 'manager'];
  if (!req.user.roles.some(r => allowedRoles.includes(r))) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const result = await db.query('SELECT * FROM catalog ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching catalog:", err);
    res.status(500).json({ message: "Error fetching catalog" });
  }
});

module.exports = router;
