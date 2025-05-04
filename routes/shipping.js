const router = require('express').Router();
const db = require('../db');

// GET /api/shipping
router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT sl.id,o.id AS order_id,sl.carrier,sl.tracking_number,sl.label_url,sl.created_at
    FROM shipping_labels sl
    JOIN orders o ON o.id=sl.order_id
  `);
  res.json(rows);
});

// POST /api/shipping
router.post('/', async (req, res) => {
  const { order_id, carrier, tracking_number, label_url } = req.body;
  const { rows } = await db.query(
    `INSERT INTO shipping_labels(order_id,carrier,tracking_number,label_url)
     VALUES($1,$2,$3,$4) RETURNING *`,
    [order_id,carrier,tracking_number,label_url]
  );
  res.status(201).json(rows[0]);
});

// DELETE /api/shipping/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM shipping_labels WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

