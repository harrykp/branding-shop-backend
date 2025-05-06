// branding-shop-backend/routes/payment_types.js

const router = require('express').Router();
const db     = require('../db');

// GET all payment types
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name
      FROM payment_types
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payment-types error', err);
    res.status(500).json({ error: 'Failed to fetch payment types' });
  }
});

// GET a single payment type
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name
       FROM payment_types
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/payment-types/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch payment type' });
  }
});

// POST create a new payment type
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO payment_types (name)
       VALUES ($1)
       RETURNING id, name`,
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/payment-types error', err);
    res.status(500).json({ error: 'Failed to create payment type' });
  }
});

// PATCH update a payment type
router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Missing name' });
  }
  try {
    const { rows } = await db.query(
      `UPDATE payment_types
       SET name = $1
       WHERE id = $2
       RETURNING id, name`,
      [name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Payment type not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/payment-types/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update payment type' });
  }
});

// DELETE a payment type
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM payment_types
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Payment type not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/payment-types/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete payment type' });
  }
});

module.exports = router;
