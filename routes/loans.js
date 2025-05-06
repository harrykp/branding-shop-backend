const router = require('express').Router();
const db     = require('../db');

// GET all loan records
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        l.id,
        l.user_id,
        u.name        AS employee_name,
        l.amount,
        l.balance,
        l.issued_at,
        l.created_at
      FROM loans l
      JOIN users u ON u.id = l.user_id
      ORDER BY l.issued_at DESC, l.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/loans error', err);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// GET single loan
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM loans WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Loan not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/loans/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// POST create loan
router.post('/', async (req, res) => {
  const { user_id, amount, balance, issued_at } = req.body;
  if (!user_id || amount == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO loans
         (user_id, amount, balance, issued_at, created_at)
       VALUES ($1,$2,$3,$4,NOW())
       RETURNING *`,
      [user_id, amount, balance||amount, issued_at||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/loans error', err);
    res.status(500).json({ error: 'Failed to create loan' });
  }
});

// PATCH update loan
router.patch('/:id', async (req, res) => {
  const fields = ['amount','balance','issued_at'];
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
      `UPDATE loans
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Loan not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/loans/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update loan' });
  }
});

// DELETE loan
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM loans WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Loan not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/loans/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete loan' });
  }
});

module.exports = router;
