// branding-shop-backend/routes/users.js

const router = require('express').Router();
const db = require('../db');

// GET all users, including their roles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(
          ARRAY_AGG(r.name) FILTER (WHERE r.name IS NOT NULL),
          '{}'
        ) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r       ON r.id = ur.role_id
      GROUP BY u.id, u.name, u.email
      ORDER BY u.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// (other user routes unchanged…)

module.exports = router;
