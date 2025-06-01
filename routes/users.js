const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users - Admins only, returns full user list with roles
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await db.query(`
      SELECT id, name, email, phone_number, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    const users = result.rows;

    const enriched = await Promise.all(users.map(async (user) => {
      const roleResult = await db.query(
        `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1`,
        [user.id]
      );
      return {
        ...user,
        roles: roleResult.rows.map(r => r.name)
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// PUT /api/users/:id - Admins only
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone_number, roles } = req.body;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    // Update user fields
    await db.query(
      'UPDATE users SET name = $1, email = $2, phone_number = $3 WHERE id = $4',
      [name, email, phone_number, id]
    );

    if (Array.isArray(roles)) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);

      for (const roleName of roles) {
        const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleRes.rows.length > 0) {
          await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [
            id,
            roleRes.rows[0].id,
          ]);
        }
      }
    }

    res.json({ message: "User updated successfully" });
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
    await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]); // clean roles first
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
