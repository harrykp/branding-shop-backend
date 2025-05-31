const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/jobs
router.get('/', authenticate, async (req, res) => {
  try {
    let result;
    if (req.user.roles.includes('customer')) {
      // Restrict customers to jobs from their orders
      result = await db.query(
        `SELECT * FROM jobs WHERE order_id IN (
           SELECT id FROM orders WHERE user_id = $1
         )`,
        [req.user.id]
      );
    } else {
      // Admins and employees see all jobs
      result = await db.query('SELECT * FROM jobs');
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/jobs
router.post('/', authenticate, async (req, res) => {
  const { order_id, department_id, status, scheduled_date } = req.body;
  const userId = req.user.id;
  try {
    const result = await db.query(
      'INSERT INTO jobs (user_id, order_id, department_id, status, scheduled_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, order_id, department_id, status || 'queued', scheduled_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating job:", err);
    res.status(500).json({ message: "Failed to create job" });
  }
});

// PUT /api/jobs/:id
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { status, scheduled_date } = req.body;

  try {
    const result = await db.query(
      'UPDATE jobs SET status = $1, scheduled_date = $2 WHERE id = $3 RETURNING *',
      [status, scheduled_date, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating job:", err);
    res.status(500).json({ message: "Error updating job" });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM jobs WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted" });
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ message: "Error deleting job" });
  }
});

module.exports = router;
