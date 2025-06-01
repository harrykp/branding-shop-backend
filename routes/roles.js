const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/roles - admin only
router.get('/', authenticate, async (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query('SELECT * FROM roles ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

// POST /api/roles - create new role
router.post('/', authenticate, async (req, res) => {
  const { name } = req.body;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating role:", err);
    res.status(500).json({ message: "Failed to create role" });
  }
});

// PUT /api/roles/:id - update role
router.put('/:id', authenticate, async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    const result = await db.query(
      'UPDATE roles SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ message: "Failed to update role" });
  }
});

// DELETE /api/roles/:id - delete role
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  try {
    await db.query('DELETE FROM roles WHERE id = $1', [id]);
    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error("Error deleting role:", err);
    res.status(500).json({ message: "Failed to delete role" });
  }
});

module.exports = router;
