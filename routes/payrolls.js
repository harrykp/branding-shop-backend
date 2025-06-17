// === /routes/payrolls.js ===

const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/payrolls
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const total = await db.one('SELECT COUNT(*) FROM payrolls WHERE notes ILIKE $1', [`%${search}%`]);
    const result = await db.any(`
      SELECT p.*, u.name AS employee_name
      FROM payrolls p
      JOIN users u ON p.user_id = u.id
      WHERE u.name ILIKE $1 OR notes ILIKE $1
      ORDER BY p.payment_date DESC
      LIMIT $2 OFFSET $3`, [`%${search}%`, limit, offset]);

    res.json({ data: result, total: parseInt(total.count) });
  } catch (err) {
    console.error('Error fetching payrolls:', err);
    res.status(500).json({ error: 'Failed to fetch payrolls' });
  }
});

// GET /api/payrolls/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const result = await db.oneOrNone(`
      SELECT p.*, u.name AS employee_name
      FROM payrolls p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`, [req.params.id]);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) {
    console.error('Error fetching payroll:', err);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// POST /api/payrolls
router.post('/', auth, async (req, res) => {
  try {
    const { user_id, gross_pay, deductions, net_pay, pay_period_start, pay_period_end, payment_date, notes } = req.body;
    const result = await db.one(`
      INSERT INTO payrolls (user_id, gross_pay, deductions, net_pay, pay_period_start, pay_period_end, payment_date, notes, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [user_id, gross_pay, deductions, net_pay, pay_period_start, pay_period_end, payment_date, notes]
    );
    res.json(result);
  } catch (err) {
    console.error('Error creating payroll:', err);
    res.status(500).json({ error: 'Failed to create payroll' });
  }
});

// PUT /api/payrolls/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { user_id, gross_pay, deductions, net_pay, pay_period_start, pay_period_end, payment_date, notes } = req.body;
    const result = await db.one(`
      UPDATE payrolls SET user_id=$1, gross_pay=$2, deductions=$3, net_pay=$4,
        pay_period_start=$5, pay_period_end=$6, payment_date=$7, notes=$8
      WHERE id=$9 RETURNING *`,
      [user_id, gross_pay, deductions, net_pay, pay_period_start, pay_period_end, payment_date, notes, req.params.id]
    );
    res.json(result);
  } catch (err) {
    console.error('Error updating payroll:', err);
    res.status(500).json({ error: 'Failed to update payroll' });
  }
});

// DELETE /api/payrolls/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.none('DELETE FROM payrolls WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting payroll:', err);
    res.status(500).json({ error: 'Failed to delete payroll' });
  }
});

module.exports = router;
