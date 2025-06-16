// routes/leave_requests.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all leave requests (paginated)
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
   const dataQuery = `
      SELECT lr.*, 
        u.name AS user_name, 
        lt.name AS leave_type_name,
        a.name AS approved_by_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN users a ON lr.approved_by = a.id
      WHERE u.name ILIKE $1
      ORDER BY lr.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE u.name ILIKE $1
    `;

    const values = [`%${search}%`, limit, offset];
    const result = await db.query(dataQuery, values);
    const countRes = await db.query(countQuery, [`%${search}%`]);

    res.json({ data: result.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
});

// POST new leave request
router.post('/', authenticate, async (req, res) => {
  const {
    user_id, leave_type_id, start_date, end_date,
    reason, status, approved_by, created_at
  } = req.body;

  try {
    await db.query(
      `INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status, approved_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [user_id, leave_type_id, start_date, end_date, reason, status, approved_by]
    );

    res.status(201).json({ message: 'Leave request created' });
  } catch (err) {
    console.error('Error creating leave request:', err);
    res.status(500).json({ message: 'Failed to create leave request' });
  }
});

// PUT update leave request
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    user_id, leave_type_id, start_date, end_date,
    reason, status, approved_by
  } = req.body;

  try {
    await db.query(
      `UPDATE leave_requests SET user_id = $1, leave_type_id = $2,
       start_date = $3, end_date = $4, reason = $5, status = $6, approved_by = $7, updated_at = NOW()
       WHERE id = $8`,
      [user_id, leave_type_id, start_date, end_date, reason, status, approved_by, id]
    );

    res.json({ message: 'Leave request updated' });
  } catch (err) {
    console.error('Error updating leave request:', err);
    res.status(500).json({ message: 'Failed to update leave request' });
  }
});

// DELETE leave request
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM leave_requests WHERE id = $1', [req.params.id]);
    res.json({ message: 'Leave request deleted' });
  } catch (err) {
    console.error('Error deleting leave request:', err);
    res.status(500).json({ message: 'Failed to delete leave request' });
  }
});

module.exports = router;
