const router = require('express').Router();
const db = require('../db');

// GET /api/products
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT p.id,p.name,p.description,p.price,p.image_url,pc.name AS category,p.product_type
    FROM products p
    LEFT JOIN product_categories pc ON pc.id=p.category_id
    ORDER BY p.created_at DESC
  `);
  res.json(rows);
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM products WHERE id=$1`, [req.params.id]);
  res.json(rows[0]);
});

// POST /api/products
router.post('/', async (req, res) => {
  const { name, description, price, image_url, category_id, product_type } = req.body;
  const { rows } = await db.query(
    `INSERT INTO products(name,description,price,image_url,category_id,product_type)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [name,description,price,image_url,category_id,product_type]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/products/:id
router.patch('/:id', async (req, res) => {
  const fields = ['name','description','price','image_url','category_id','product_type'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE products SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM products WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

