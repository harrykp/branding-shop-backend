// branding-shop-backend/routes/mockups.js

const router = require('express').Router();
const db     = require('../db');

// GET all mockups
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        m.id,
        m.quote_id,
        q.customer_id,
        u.name        AS customer_name,
        m.image_url,
        m.created_at
      FROM mockups m
      JOIN quotes q   ON q.id = m.quote_id
      JOIN users u    ON u.id = q.customer_id
      ORDER BY m.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/mockups error', err);
    res.status(500).json({ error: 'Failed to fetch mockups' });
  }
});

// GET single mockup
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM mockups WHERE id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Mockup not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/mockups/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch mockup' });
  }
});

// POST create mockup
router.post('/', async (req, res) => {
  const { quote_id, image_url } = req.body;
  if (!quote_id || !image_url) {
    return res.status(400).json({ error: 'Missing quote_id or image_url' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO mockups
         (quote_id, image_url, created_at)
       VALUES ($1,$2,NOW())
       RETURNING *`,
      [quote_id, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/mockups error', err);
    res.status(500).json({ error: 'Failed to create mockup' });
  }
});

// DELETE mockup
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM mockups WHERE id=$1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Mockup not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/mockups/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete mockup' });
  }
});

module.exports = router;
