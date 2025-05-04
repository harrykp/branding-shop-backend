const router = require('express').Router();
const db = require('../db');

// GET /api/mockups
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT pm.id,pm.product_id,pm.file_url,pm.created_at
    FROM product_mockups pm
  `);
  res.json(rows);
});

// POST /api/mockups
router.post('/', async (req, res) => {
  const { product_id, file_url } = req.body;
  const { rows } = await db.query(
    `INSERT INTO product_mockups(product_id,file_url)
     VALUES($1,$2) RETURNING *`,
    [product_id,file_url]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/mockups/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM product_mockups WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

