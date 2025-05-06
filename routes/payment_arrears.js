// branding-shop-backend/routes/payment_arrears.js

const router = require('express').Router();
const db     = require('../db');

// GET all arrears
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        pa.id,
        pa.order_id,
        o.total       AS order_total,
        pa.sales_rep_id,
        u.name        AS sales_rep_name,
        pa.amount_due,
        pa.due_date,
        pa.created_at
      FROM payment_arrears pa
      LEFT JOIN orders o    ON o.id = pa.order_id
      LEFT JOIN users u     ON u.id = pa.sales_rep_id
      ORDER BY pa.due_date ASC, pa.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payment-arrears error', err);
    res.status(500).json({ error: 'Failed to fetch payment arrears' });
  }
});

// GET single arrears record
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM payment_arrears WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Arrears record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/payment-arrears/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch arrears record' });
  }
});

// POST create a new arrears record
router.post('/', async (req, res) => {
  const { order_id, sales_rep_id, amount_due, due_date } = req.body;
  if (!order_id || !sales_rep_id || amount_due == null || !due_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO payment_arrears
         (order_id, sales_rep_id, amount_due, due_date, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING *`,
      [order_id, sales_rep_id, amount_due, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payment-arrears error', err);
    res.status(500).json({ error: 'Failed to create arrears record' });
  }
});

// PATCH update an arrears record
router.patch('/:id', async (req, res) => {
  const fields = ['order_id','sales_rep_id','amount_due','due_date'];
  const sets = [], vals = [];
  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length+1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'No updatable fields' });
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE payment_arrears
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Arrears record not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/payment-arrears/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update arrears record' });
  }
});

// DELETE an arrears record
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM payment_arrears WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Arrears record not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/payment-arrears/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete arrears record' });
  }
});

module.exports = router;
