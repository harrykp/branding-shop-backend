// routes/leave_requests.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all leave requests with pagination and search
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const query = `%${search.toLowerCase()}%`;

    const totalRes = await db.query(`SELECT COUNT(*) FROM leave_requests`);
    const total = parseInt(totalRes.rows[0].count);

    const result = await db.query(`
      SELECT lr.*, u.name AS user_name, lt.name AS leave_type_name
      FROM leave_requests lr
      LEFT JOIN users u ON lr.user_id = u.id
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE LOWER(COALESCE(u.name, '') || COALESCE(lt.name, '')) LIKE $1
      ORDER BY lr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [query, limit, offset]);

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
});

// GET single leave request
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM leave_requests WHERE id = $1
    `, [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching leave request:', err);
    res.status(500).json({ message: 'Failed to fetch leave request' });
  }
});

// POST create leave request
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      user_id, leave_type_id, start_date, end_date,
      reason, status, approver_id
    } = req.body;

    await db.query(`
      INSERT INTO leave_requests (
        user_id, leave_type_id, start_date, end_date,
        reason, status, approver_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      user_id, leave_type_id, start_date, end_date,
      reason, status, approver_id, req.user.userId
    ]);

    res.status(201).json({ message: 'Leave request created' });
  } catch (err) {
    console.error('Error creating leave request:', err);
    res.status(500).json({ message: 'Failed to create leave request' });
  }
});

// PUT update leave request
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      user_id, leave_type_id, start_date, end_date,
      reason, status, approver_id
    } = req.body;

    await db.query(`
      UPDATE leave_requests SET
        user_id=$1, leave_type_id=$2, start_date=$3, end_date=$4,
        reason=$5, status=$6, approver_id=$7, updated_at=NOW()
      WHERE id = $8
    `, [
      user_id, leave_type_id, start_date, end_date,
      reason, status, approver_id, req.params.id
    ]);

    res.json({ message: 'Leave request updated' });
  } catch (err) {
    console.error('Error updating leave request:', err);
    res.status(500).json({ message: 'Failed to update leave request' });
  }
});

// DELETE leave request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query(`DELETE FROM leave_requests WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    console.error('Error deleting leave request:', err);
    res.status(500).json({ message: 'Failed to delete leave request' });
  }
});

module.exports = router;
