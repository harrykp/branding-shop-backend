// branding-shop-backend/routes/vacation_requests.js

const router = require('express').Router();
const db     = require('../db');

// GET all vacation requests
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        vr.id,
        vr.employee_id,
        u.name         AS employee_name,
        vr.start_date,
        vr.end_date,
        vr.status,
        vr.requested_at
      FROM vacation_requests vr
      JOIN users u    ON u.id = vr.employee_id
      ORDER BY vr.requested_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/vacation-requests error', err);
    res.status(500).json({ error: 'Failed to fetch vacation requests' });
  }
});

// GET single request
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM vacation_requests WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/vacation-requests/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// POST create a new vacation request
router.post('/', async (req, res) => {
  const { employee_id, start_date, end_date } = req.body;
  if (!employee_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO vacation_requests
         (employee_id, start_date, end_date, status, requested_at)
       VALUES ($1,$2,$3,'pending',NOW())
       RETURNING *`,
      [employee_id, start_date, end_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/vacation-requests error', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// PATCH update status (e.g. approve/reject)
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Missing status field' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE vacation_requests
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/vacation-requests/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// DELETE a request
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM vacation_requests WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Request not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/vacation-requests/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

module.exports = router;
