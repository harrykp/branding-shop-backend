const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/commissions
router.get('/', authenticate, async (req, res) => {
  const adminRoles = ['admin', 'finance', 'accountant', 'executive'];
  const selfViewRoles = ['sales', 'employee', 'staff'];

  try {
    if (req.user.roles.some(role => adminRoles.includes(role))) {
      const result = await db.query('SELECT * FROM commissions ORDER BY created_at DESC');
      return res.json(result.rows);
    } else if (req.user.roles.some(role => selfViewRoles.includes(role))) {
      const result = await db.query(
        'SELECT * FROM commissions WHERE user_id = $1 ORDER BY created_at DESC',
        [req.user.id]
      );
      return res.json(result.rows);
    } else {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (err) {
    console.error("Error fetching commissions:", err);
    res.status(500).json({ message: "Error loading commissions" });
  }
});

module.exports = router;
