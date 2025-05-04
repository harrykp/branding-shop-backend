const router = require('express').Router();
const db = require('../db');

// GET /api/purchase-orders
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT po.id,s.name AS supplier,po.status,po.created_at
    FROM purchase_orders po
    JOIN suppliers s ON s.id=po.supplier_id
  `);
  res.json(rows);
});

// POST /api/purchase-orders
router.post('/', async (req, res) => {
  const { supplier_id, items } = req.body;
  const { rows } = await db.query(
    `INSERT INTO purchase_orders(supplier_id,status) VALUES($1,'pending') RETURNING *`,
    [supplier_id]
  );
  const poId = rows[0].id;
  for (let it of items) {
    await db.query(
      `INSERT INTO purchase_order_items(purchase_order_id,catalog_item_id,qty)
       VALUES($1,$2,$3)`,
      [poId,it.catalog_item_id,it.qty]
    );
  }
  res.status(201).json(rows[0]);
});

// PATCH /api/purchase-orders/:id
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const { rows } = await db.query(
    `UPDATE purchase_orders SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM purchase_orders WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

