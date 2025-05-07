// branding-shop-backend/routes/product_categories.js

const router = require('express').Router();
const db     = require('../db');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name
      FROM product_categories
      ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/product-categories error', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET one category
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name
       FROM product_categories
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/product-categories/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// POST create
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Missing name' });

  try {
    const { rows } = await db.query(
      `INSERT INTO product_categories (name)
       VALUES ($1)
       RETURNING id, name`,
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/product-categories error', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PATCH update
router.patch('/:id', async (req, res) => {
  const { name } = req.body;
  if (name === undefined) return res.status(400).json({ error: 'Missing name' });

  try {
    const { rows } = await db.query(
      `UPDATE product_categories
       SET name = $1
       WHERE id = $2
       RETURNING id, name`,
      [name, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Category not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/product-categories/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM product_categories WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Category not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/product-categories/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
