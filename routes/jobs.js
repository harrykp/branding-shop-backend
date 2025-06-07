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

    const jobsRes = await db.query(
      `
      SELECT j.*,
             d.name AS department_name,
             u.name AS assigned_to_name,
             p.name AS product_name,
             cu.name AS customer_name,
             sr.name AS sales_rep_name
      FROM jobs j
      LEFT JOIN departments d ON j.department_id = d.id
      LEFT JOIN users u ON j.assigned_to = u.id
      LEFT JOIN products p ON j.product_id = p.id
      LEFT JOIN customers cu ON j.customer_id = cu.id
      LEFT JOIN users sr ON j.sales_rep_id = sr.id
      WHERE LOWER(COALESCE(j.job_name, j.id::text)) LIKE $1
      ORDER BY j.created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [searchQuery, limit, offset]
    );

    res.json({ data: jobsRes.rows, total });
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
      customer_id, sales_rep_id, started_at,
      type, status, qty, qty_remaining, price, ordered_value,
      completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
      balance_unpaid, balance_unpaid_taxed, percent_complete, delivery_date,
      payment_status, payment_due_date, priority, stage, comments
    } = req.body;

    const created_by = req.user.userId;

    await db.query(
      `INSERT INTO jobs (
        job_name, order_id, product_id, deal_id, department_id, assigned_to,
        customer_id, sales_rep_id, started_at,
        type, status, qty, qty_remaining, price, ordered_value,
        completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
        balance_unpaid, balance_unpaid_taxed, percent_complete,
        delivery_date, payment_status, payment_due_date,
        priority, stage, comments, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26,
        $27, $28, $29, $30
      )`,
      [
        job_name, order_id, product_id, deal_id, department_id, assigned_to,
        customer_id, sales_rep_id, started_at,
        type, status, qty, qty_remaining, price, ordered_value,
        completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
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
      customer_id, sales_rep_id, started_at,
      type, status, qty, qty_remaining, price, ordered_value,
      completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
      balance_unpaid, balance_unpaid_taxed, percent_complete, delivery_date,
      payment_status, payment_due_date, priority, stage, comments
    } = req.body;

    const updated_by = req.user.userId;

    await db.query(
      `UPDATE jobs SET
        job_name=$1, order_id=$2, product_id=$3, deal_id=$4,
        department_id=$5, assigned_to=$6, customer_id=$7, sales_rep_id=$8, started_at=$9,
        type=$10, status=$11, qty=$12, qty_remaining=$13, price=$14, ordered_value=$15,
        completed_qty=$16, completed_value=$17, taxed=$18, completed_tax_amount=$19, completed_value_with_tax=$20,
        balance_unpaid=$21, balance_unpaid_taxed=$22, percent_complete=$23,
        delivery_date=$24, payment_status=$25, payment_due_date=$26,
        priority=$27, stage=$28, comments=$29, updated_by=$30, updated_at=NOW()
      WHERE id = $31`,
      [
        job_name, order_id, product_id, deal_id,
        department_id, assigned_to, customer_id, sales_rep_id, started_at,
        type, status, qty, qty_remaining, price, ordered_value,
        completed_qty, completed_value, taxed, completed_tax_amount, completed_value_with_tax,
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
