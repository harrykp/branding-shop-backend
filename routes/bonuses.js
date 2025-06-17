// routes/bonuses.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all bonuses with pagination and search
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM bonuses b
       JOIN users u ON b.user_id = u.id
       WHERE u.name ILIKE $1`,
      [`%${search}%`]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT b.*, u.name AS user_name, a.name AS awarded_by_name
       FROM bonuses b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON b.awarded_by = a.id
       WHERE u.name ILIKE $1
       ORDER BY b.id DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching bonuses:', err);
    res.status(500).json({ message: 'Failed to fetch bonuses' });
  }
});

// GET single bonus
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, u.name AS user_name, a.name AS awarded_by_name
       FROM bonuses b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN users a ON b.awarded_by = a.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bonus not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching bonus:', err);
    res.status(500).json({ message: 'Failed to fetch bonus' });
  }
});

// CREATE bonus
router.post('/', authenticate, async (req, res) => {
  const { user_id, amount, reason, awarded_by, awarded_date, notes } = req.body;

  try {
    await db.query(
      `INSERT INTO bonuses (user_id, amount, reason, awarded_by, awarded_date, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [user_id, amount, reason, awarded_by, awarded_date, notes]
    );
    res.status(201).json({ message: 'Bonus created' });
  } catch (err) {
    console.error('Error creating bonus:', err);
    res.status(500).json({ message: 'Failed to create bonus' });
  }
});

// UPDATE bonus
router.put('/:id', authenticate, async (req, res) => {
  const { user_id, amount, reason, awarded_by, awarded_date, notes } = req.body;

  try {
    await db.query(
      `UPDATE bonuses
       SET user_id = $1, amount = $2, reason = $3, awarded_by = $4, awarded_date = $5, notes = $6
       WHERE id = $7`,
      [user_id, amount, reason, awarded_by, awarded_date, notes, req.params.id]
    );
    res.json({ message: 'Bonus updated' });
  } catch (err) {
    console.error('Error updating bonus:', err);
    res.status(500).json({ message: 'Failed to update bonus' });
  }
});

// DELETE bonus
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM bonuses WHERE id = $1', [req.params.id]);
    res.json({ message: 'Bonus deleted' });
  } catch (err) {
    console.error('Error deleting bonus:', err);
    res.status(500).json({ message: 'Failed to delete bonus' });
  }
});

module.exports = router;
