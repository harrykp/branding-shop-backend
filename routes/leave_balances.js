// routes/leave_balances.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all leave balances (paginated & filtered)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const query = `%${search.toLowerCase()}%`;

    const totalRes = await db.query('SELECT COUNT(*) FROM leave_balances');
    const total = parseInt(totalRes.rows[0].count);

    const result = await db.query(`
      SELECT lb.*, u.name AS employee_name, lt.name AS leave_type_name
      FROM leave_balances lb
      JOIN users u ON lb.user_id = u.id
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE LOWER(u.name) LIKE $1
      ORDER BY lb.year DESC, u.name
      LIMIT $2 OFFSET $3
    `, [query, limit, offset]);

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching leave balances:', err);
    res.status(500).json({ message: 'Failed to fetch leave balances' });
  }
});

// GET single leave balance by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT lb.*, u.name AS employee_name, lt.name AS leave_type_name
      FROM leave_balances lb
      JOIN users u ON lb.user_id = u.id
      JOIN leave_types lt ON lb.leave_type_id = lt.id
      WHERE lb.id = $1
    `, [req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching leave balance:', err);
    res.status(500).json({ message: 'Failed to fetch leave balance' });
  }
});

// POST create new leave balance
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      user_id, leave_type_id, year,
      allocated_days, used_days
    } = req.body;

    await db.query(`
      INSERT INTO leave_balances (
        user_id, leave_type_id, year, allocated_days,
        used_days, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    `, [
      user_id, leave_type_id, year, allocated_days,
      used_days, req.user.userId
    ]);

    res.status(201).json({ message: 'Leave balance created' });
  } catch (err) {
    console.error('Error creating leave balance:', err);
    res.status(500).json({ message: 'Failed to create leave balance' });
  }
});

// PUT update leave balance
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      user_id, leave_type_id, year,
      allocated_days, used_days
    } = req.body;

    await db.query(`
      UPDATE leave_balances SET
        user_id = $1,
        leave_type_id = $2,
        year = $3,
        allocated_days = $4,
        used_days = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [
      user_id, leave_type_id, year,
      allocated_days, used_days, req.params.id
    ]);

    res.json({ message: 'Leave balance updated' });
  } catch (err) {
    console.error('Error updating leave balance:', err);
    res.status(500).json({ message: 'Failed to update leave balance' });
  }
});

// DELETE leave balance
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM leave_balances WHERE id = $1', [req.params.id]);
    res.json({ message: 'Leave balance deleted' });
  } catch (err) {
    console.error('Error deleting leave balance:', err);
    res.status(500).json({ message: 'Failed to delete leave balance' });
  }
});

module.exports = router;
