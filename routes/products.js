// branding-shop-backend/routes/products.js
const router = require('express').Router();
const db = require('../db');

// GET all
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.*, pc.name AS category_name
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id=pc.id
    ORDER BY p.id
  `);
  res.json(rows);
});

// GET one
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM products WHERE id=$1`, [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error:'Not found' });
  res.json(rows[0]);
});

// CREATE
router.post('/', async (req, res) => {
  const { name, description, price, image_url, category_id, product_type } = req.body;
  const { rows } = await db.query(
    `INSERT INTO products
     (name,description,price,image_url,category_id,product_type)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name,description,price,image_url,category_id,product_type]
  );
  res.status(201).json(rows[0]);
});

// UPDATE
router.patch('/:id', async (req, res) => {
  const fields = ['name','description','price','image_url','category_id','product_type'];
  const sets = fields.filter(f=>f in req.body)
                     .map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  if (!sets.length) return res.status(400).json({ error:'No fields' });
  const { rows } = await db.query(
    `UPDATE products SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`,
    [...vals, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM products WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;
