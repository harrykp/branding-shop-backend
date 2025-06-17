// === routes/payrolls.js ===

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/payrolls
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM payrolls p JOIN users u ON p.user_id = u.id 
       WHERE u.name ILIKE $1 OR COALESCE(p.notes, '') ILIKE $1`,
      [`%${search}%`]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT p.*, u.name AS employee_name 
       FROM payrolls p 
       JOIN users u ON p.user_id = u.id 
       WHERE u.name ILIKE $1 OR COALESCE(p.notes, '') ILIKE $1 
       ORDER BY p.paid_on DESC 
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    res.json({ data: result.rows, total });
  } catch (err) {
    console.error('Error fetching payrolls:', err);
    res.status(500).json({ error: 'Failed to fetch payrolls' });
  }
});

// GET /api/payrolls/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, u.name AS employee_name 
       FROM payrolls p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching payroll by ID:', err);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// POST /api/payrolls
router.post('/', authenticate, async (req, res) => {
  const {
    user_id, period_start, period_end, gross_salary, bonuses, ssnit,
    paye, deductions, net_salary, paid_on, status, notes
  } = req.body;

  try {
    await db.query(
      `INSERT INTO payrolls (
        user_id, period_start, period_end, gross_salary, bonuses, ssnit,
        paye, deductions, net_salary, paid_on, status, notes, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
      [user_id, period_start, period_end, gross_salary, bonuses, ssnit, paye, deductions, net_salary, paid_on, status, notes]
    );
    res.status(201).json({ message: 'Payroll created' });
  } catch (err) {
    console.error('Error creating payroll:', err);
    res.status(500).json({ error: 'Failed to create payroll' });
  }
});

// PUT /api/payrolls/:id
router.put('/:id', authenticate, async (req, res) => {
  const {
    user_id, period_start, period_end, gross_salary, bonuses, ssnit,
    paye, deductions, net_salary, paid_on, status, notes
  } = req.body;

  try {
    await db.query(
      `UPDATE payrolls SET 
        user_id=$1, period_start=$2, period_end=$3, gross_salary=$4, bonuses=$5, 
        ssnit=$6, paye=$7, deductions=$8, net_salary=$9, paid_on=$10, status=$11, notes=$12 
       WHERE id=$13`,
      [user_id, period_start, period_end, gross_salary, bonuses, ssnit, paye, deductions, net_salary, paid_on, status, notes, req.params.id]
    );
    res.json({ message: 'Payroll updated' });
  } catch (err) {
    console.error('Error updating payroll:', err);
    res.status(500).json({ error: 'Failed to update payroll' });
  }
});

// DELETE /api/payrolls/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM payrolls WHERE id = $1', [req.params.id]);
    res.json({ message: 'Payroll deleted' });
  } catch (err) {
    console.error('Error deleting payroll:', err);
    res.status(500).json({ error: 'Failed to delete payroll' });
  }
});

module.exports = router;
