// branding-shop-backend/routes/payrolls.js

const router = require('express').Router();
const db     = require('../db');

// GET all payroll entries
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        p.id,
        p.user_id,
        u.name        AS employee_name,
        p.period_start,
        p.period_end,
        p.gross_pay,
        p.net_pay,
        p.paid_at,
        p.created_at
      FROM payrolls p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.paid_at DESC, p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payrolls error', err);
    res.status(500).json({ error: 'Failed to fetch payrolls' });
  }
});

// GET a single payroll record
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM payrolls WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payroll not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/payrolls/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// POST create a new payroll record
router.post('/', async (req, res) => {
  const { user_id, period_start, period_end, gross_pay, net_pay } = req.body;
  if (!user_id || !period_start || !period_end || gross_pay == null || net_pay == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO payrolls
         (user_id, period_start, period_end, gross_pay, net_pay, paid_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING *`,
      [user_id, period_start, period_end, gross_pay, net_pay]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payrolls error', err);
    res.status(500).json({ error: 'Failed to create payroll record' });
  }
});

// PATCH update a payroll record
router.patch('/:id', async (req, res) => {
  const fields = ['period_start','period_end','gross_pay','net_pay','paid_at'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f}=$${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE payrolls
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payroll not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/payrolls/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update payroll' });
  }
});

// DELETE a payroll record
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM payrolls WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Payroll not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/payrolls/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete payroll' });
  }
});

module.exports = router;
