const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const authMiddleware = require('../middleware/auth');

// PUT /api/admin/reset-password
router.put('/reset-password', authMiddleware.requireAdmin, async (req, res) => {
  const { email, newPassword } = req.body;

  const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) return res.status(404).json({ message: "User not found" });

  const hash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

  res.json({ message: "Password successfully reset." });
});

module.exports = router;
