
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at,
        ARRAY_REMOVE(ARRAY_AGG(r.name), NULL) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, email, roles } = req.body;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3',
      [name, email, id]
    );

    await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

    for (const roleName of roles) {
      const { rows } = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
      if (rows.length > 0) {
        await client.query(
          'INSERT INTO user_roles(user_id, role_id) VALUES($1, $2)',
          [id, rows[0].id]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: "User updated successfully" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Update failed" });
  } finally {
    client.release();
  }
});

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
