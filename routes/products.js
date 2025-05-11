// branding-shop-backend/routes/products.js

const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/products
 * Optional query param: category_id to filter products by category
 */
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    let sql = `
      SELECT p.id,
             p.name,
             p.sku,
             p.price,
             p.description,
             p.image_url,
             p.category_id,
             pc.name AS category_name,
             p.product_type
      FROM products p
      LEFT JOIN product_categories pc ON p.category_id = pc.id`;
    const params = [];
    if (category_id) {
      params.push(category_id);
      sql += ` WHERE p.category_id = $1`;
    }
    sql += ` ORDER BY p.name`;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/products error', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/products/:id
 * Fetch a single product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id,
              p.name,
              p.sku,
              p.price,
              p.description,
              p.image_url,
              p.category_id,
              pc.name AS category_name,
              p.product_type
         FROM products p
         LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/products/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', async (req, res) => {
  const { name, sku, price, description, image_url, category_id, product_type } = req.body;
  if (!name || sku == null || price == null) {
    return res.status(400).json({ error: 'Missing required fields: name, sku, price' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO products
         (name, sku, description, price, image_url, category_id, product_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, sku, description, price, image_url, category_id, product_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/products error', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PATCH /api/products/:id
 * Update product fields
 */
router.patch('/:id', async (req, res) => {
  const fields = ['name', 'sku', 'description', 'price', 'image_url', 'category_id', 'product_type'];
  const sets = [];
  const vals = [];

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length + 1}`);
      vals.push(req.body[field]);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE products
         SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/products/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/products/:id
 * Delete a product
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM products WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Product not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/products/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
