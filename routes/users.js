const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/users - Admins only, full user list with roles
router.get('/', authenticate, async (req, res) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const result = await db.query(
      'SELECT id, name, email, phone_number, created_at FROM users ORDER BY created_at DESC'
    );

    const usersWithRoles = await Promise.all(
      result.rows.map(async user => {
        const roleRes = await db.query(
          'SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = $1',
          [user.id]
        );
        return {
          ...user,
          roles: roleRes.rows.map(r => r.name)
        };
      })
    );

    res.json({ data: usersWithRoles });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// PUT /api/users/:id - Admins only
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { name, email, roles } = req.body;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    await db.query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);

    if (Array.isArray(roles)) {
      await db.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      for (const roleName of roles) {
        const roleRes = await db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleRes.rows.length > 0) {
          await db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [id, roleRes.rows[0].id]);
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
    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
});

// GET /api/users/count
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

// Lightweight list of users for dropdowns
router.get('/options', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM users ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user options:", err);
    res.status(500).json({ message: "Error fetching user options" });
  }
});


module.exports = router;
