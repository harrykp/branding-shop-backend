// routes/jobs.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all jobs (paginated + filtered)
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const searchQuery = `%${search.toLowerCase()}%`;

    const totalRes = await db.query(`SELECT COUNT(*) FROM jobs`);
    const total = parseInt(totalRes.rows[0].count);

    const jobs = await db.query(
      `SELECT j.*, d.name AS department_name, u.name AS assigned_to_name, p.name AS product_name
       FROM jobs j
       LEFT JOIN departments d ON j.department_id = d.id
       LEFT JOIN users u ON j.assigned_to = u.id
       LEFT JOIN products p ON j.product_id = p.id
       WHERE LOWER(j.job_name) LIKE $1
       ORDER BY j.created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );

    res.json({ data: jobs.rows, total });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// GET single job by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// POST new job
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      job_name, order_id, product_id, deal_id, department_id, assigned_to,
      type, status, qty, qty_remaining, price, ordered_value,
      completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
      balance_unpaid, balance_unpaid_taxed, percent_complete, delivery_date,
      payment_status, payment_due_date, priority, stage, comments
    } = req.body;

    const created_by = req.user.userId;

    await db.query(
      `INSERT INTO jobs (
        job_name, order_id, product_id, deal_id, department_id, assigned_to, type, status,
        qty, qty_remaining, price, ordered_value, completed_qty, completed_value,
        taxed, completed_tax_amount, completed_value_with_tax,
        balance_unpaid, balance_unpaid_taxed, percent_complete,
        delivery_date, payment_status, payment_due_date,
        priority, stage, comments, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27
      )`,
      [
        job_name, order_id, product_id, deal_id, department_id, assigned_to, type, status,
        qty, qty_remaining, price, ordered_value, completed_qty, completed_value,
        taxed, completed_tax_amount, completed_value_with_tax,
        balance_unpaid, balance_unpaid_taxed, percent_complete,
        delivery_date, payment_status, payment_due_date,
        priority, stage, comments, created_by
      ]
    );

    res.status(201).json({ message: 'Job created' });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ message: 'Failed to create job' });
  }
});

// PUT update job
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      job_name, order_id, product_id, deal_id, department_id, assigned_to,
      type, status, qty, qty_remaining, price, ordered_value,
      completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
      balance_unpaid, balance_unpaid_taxed, percent_complete, delivery_date,
      payment_status, payment_due_date, priority, stage, comments
    } = req.body;

    const updated_by = req.user.userId;

    await db.query(
      `UPDATE jobs SET
        job_name=$1, order_id=$2, product_id=$3, deal_id=$4,
        department_id=$5, assigned_to=$6, type=$7, status=$8,
        qty=$9, qty_remaining=$10, price=$11, ordered_value=$12,
        completed_qty=$13, completed_value=$14,
        taxed=$15, completed_tax_amount=$16, completed_value_with_tax=$17,
        balance_unpaid=$18, balance_unpaid_taxed=$19, percent_complete=$20,
        delivery_date=$21, payment_status=$22, payment_due_date=$23,
        priority=$24, stage=$25, comments=$26, updated_by=$27, updated_at=NOW()
      WHERE id = $28`,
      [
        job_name, order_id, product_id, deal_id,
        department_id, assigned_to, type, status,
        qty, qty_remaining, price, ordered_value,
        completed_qty, completed_value,
        taxed, completed_tax_amount, completed_value_with_tax,
        balance_unpaid, balance_unpaid_taxed, percent_complete,
        delivery_date, payment_status, payment_due_date,
        priority, stage, comments, updated_by, req.params.id
      ]
    );

    res.json({ message: 'Job updated' });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// DELETE job
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ message: 'Failed to delete job' });
  }
});

module.exports = router;
