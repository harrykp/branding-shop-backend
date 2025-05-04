const router = require('express').Router();
const db = require('../db');

// GET /api/pricing-rules
router.get('/', async (req, res) => {
  const { rows } = await db.query(`SELECT * FROM pricing_rules`);
  res.json(rows);
});

// POST /api/pricing-rules
router.post('/', async (req, res) => {
  const { rule_type, decoration_type, min_qty, max_qty, unit_price } = req.body;
  const { rows } = await db.query(
    `INSERT INTO pricing_rules(rule_type,decoration_type,min_qty,max_qty,unit_price)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [rule_type, decoration_type, min_qty, max_qty, unit_price]
  );
  res.status(201).json(rows[0]);
});

// PATCH /api/pricing-rules/:id
router.patch('/:id', async (req, res) => {
  const fields = ['rule_type','decoration_type','min_qty','max_qty','unit_price'];
  const sets = fields.filter(f=>f in req.body).map((f,i)=>`${f}=$${i+1}`);
  const vals = fields.filter(f=>f in req.body).map(f=>req.body[f]);
  const query = `UPDATE pricing_rules SET ${sets.join(',')} WHERE id=$${sets.length+1} RETURNING *`;
  const { rows } = await db.query(query, [...vals, req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/pricing-rules/:id
router.delete('/:id', async (req, res) => {
  await db.query(`DELETE FROM pricing_rules WHERE id=$1`, [req.params.id]);
  res.status(204).end();
});

module.exports = router;

