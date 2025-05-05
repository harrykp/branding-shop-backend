// branding-shop-backend/routes/hr.js

const router = require('express').Router();
const db = require('../db');

// GET all HR info
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT h.id, u.name AS user_name, h.ssn, h.position, h.salary, h.hire_date
      FROM hr_info h
      JOIN users u ON u.id = h.user_id
      ORDER BY h.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/hr error', err);
    res.status(500).json({ error: 'Failed to fetch HR info' });
  }
});

// GET one HR record by id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT h.id, h.user_id, u.name AS user_name, h.ssn, h.position, h.salary, h.hire_date
       FROM hr_info h
       JOIN users u ON u.id = h.user_id
       WHERE h.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'HR record not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/hr/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch HR record' });
  }
});

// PATCH update HR info
router.patch('/:id', async (req, res) => {
  try {
    const fields = ['position', 'salary'];
    const sets = fields
      .filter(f => f in req.body)
      .map((f, i) => `${f} = $${i+1}`);
    const vals = fields.filter(f => f in req.body).map(f => req.body[f]);

    if (!sets.length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { rows } = await db.query(
      `UPDATE hr_info
       SET ${sets.join(', ')}
       WHERE id = $${sets.length + 1}
       RETURNING id, user_id, position, salary, hire_date`,
      [...vals, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/hr/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update HR record' });
  }
});

module.exports = router;
