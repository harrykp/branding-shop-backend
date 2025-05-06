// branding-shop-backend/routes/chart_accounts.js

const router = require('express').Router();
const db     = require('../db');

// GET all chart of accounts
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        ca.id,
        ca.code,
        ca.name,
        ca.type,
        ca.created_at
      FROM chart_accounts ca
      ORDER BY ca.code
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/chart-accounts error', err);
    res.status(500).json({ error: 'Failed to fetch chart accounts' });
  }
});

// GET single account
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, code, name, type, created_at
       FROM chart_accounts
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/chart-accounts/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

// POST create a new account
router.post('/', async (req, res) => {
  const { code, name, type } = req.body;
  if (!code || !name || !type) {
    return res.status(400).json({ error: 'Missing code, name, or type' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO chart_accounts
         (code, name, type)
       VALUES ($1,$2,$3)
       RETURNING id, code, name, type`,
      [code, name, type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/chart-accounts error', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// PATCH update an account
router.patch('/:id', async (req, res) => {
  const fields = ['code','name','type'];
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
      `UPDATE chart_accounts
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING id, code, name, type`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Account not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/chart-accounts/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// DELETE an account
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM chart_accounts WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Account not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/chart-accounts/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
