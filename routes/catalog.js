const router = require('express').Router();
const db = require('../db');

// GET /api/catalog
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT c.id,s.name AS supplier,c.sku,c.name,c.cost,c.currency
    FROM catalog_items c
    LEFT JOIN suppliers s ON s.id=c.supplier_id
  `);
  res.json(rows);
});

// POST /api/catalog
router.post('/', async (req, res) => {
  const { supplier_id, sku, name, cost, currency } = req.body;
  const { rows } = await db.query(
    `INSERT INTO catalog_items(supplier_id,sku,name,cost,currency)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [supplier_id,sku,name,cost,currency]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/catalog/:id
router.patch('/:id', async (req, res) => {
  const fields = ['supplier_id','sku','name','cost','currency'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE catalog_items SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query,[...vals,req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/catalog/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM catalog_items WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

