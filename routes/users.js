const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users - Admins only
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await db.query('SELECT id, email, full_name, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/users/:id - Admins only
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { full_name, email } = req.body;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query(
      'UPDATE users SET full_name = $1, email = $2 WHERE id = $3 RETURNING id, full_name, email',
      [full_name, email, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Error updating user" });
  }
});

// DELETE /api/users/:id - Admins only
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

// GET /api/users/count - Admins only
router.get('/count', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await db.query('SELECT COUNT(*) FROM users');
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error("User count error:", err);
    res.status(500).json({ message: "Error fetching user count" });
  }
});

module.exports = router;
