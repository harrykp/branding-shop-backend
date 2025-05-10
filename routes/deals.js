// branding-shop-backend/routes/deals.js

const router = require('express').Router();
const db     = require('../db');

// GET all deals (with optional quote info)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        d.id                   AS deal_id,
        d.lead_id,
        l.name                 AS lead_name,

        d.assigned_to          AS sales_rep_id,
        u.name                 AS sales_rep,

        d.value                AS deal_value,
        d.status               AS deal_status,
        d.created_at           AS deal_date,

        d.quote_id,
        q.quantity             AS quote_qty,
        q.unit_price           AS quote_unit_price,
        q.total                AS quote_total,

        p.id                   AS product_id,
        p.name                 AS product,
        p.sku                  AS product_code,

        cu.id                  AS customer_id,
        cu.name                AS customer_name,
        cu.phone_number        AS customer_phone

      FROM deals d
      JOIN leads   l  ON l.id = d.lead_id
      JOIN users   u  ON u.id = d.assigned_to

      LEFT JOIN quotes   q  ON q.id = d.quote_id
      LEFT JOIN products p  ON p.id = q.product_id
      LEFT JOIN users    cu ON cu.id = q.customer_id

      ORDER BY d.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/deals error', err);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// GET one deal by id (with the same joins)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        d.id                   AS deal_id,
        d.lead_id,
        l.name                 AS lead_name,

        d.assigned_to          AS sales_rep_id,
        u.name                 AS sales_rep,

        d.value                AS deal_value,
        d.status               AS deal_status,
        d.created_at           AS deal_date,

        d.quote_id,
        q.quantity             AS quote_qty,
        q.unit_price           AS quote_unit_price,
        q.total                AS quote_total,

        p.id                   AS product_id,
        p.name                 AS product,
        p.sku                  AS product_code,

        cu.id                  AS customer_id,
        cu.name                AS customer_name,
        cu.phone_number        AS customer_phone

      FROM deals d
      JOIN leads   l  ON l.id = d.lead_id
      JOIN users   u  ON u.id = d.assigned_to

      LEFT JOIN quotes   q  ON q.id = d.quote_id
      LEFT JOIN products p  ON p.id = q.product_id
      LEFT JOIN users    cu ON cu.id = q.customer_id

      WHERE d.id = $1
    `, [req.params.id]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// POST create new deal
router.post('/', async (req, res) => {
  const { lead_id, quote_id, assigned_to, value } = req.body;
  if (!lead_id && !quote_id) {
    return res.status(400).json({ error: 'Must provide lead_id or quote_id' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO deals
         (lead_id, quote_id, assigned_to, value, status)
       VALUES ($1, $2, $3, $4, 'new')
       RETURNING id AS deal_id,
                 lead_id,
                 assigned_to AS sales_rep_id,
                 value AS deal_value,
                 status AS deal_status,
                 created_at AS deal_date`,
      [lead_id || null, quote_id || null, assigned_to || null, value]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/deals error', err);
    res.status(500).json({ error: err.message || 'Failed to create deal' });
  }
});

// PATCH update deal fields
router.patch('/:id', async (req, res) => {
  const fields = ['lead_id','quote_id','assigned_to','value','status'];
  const sets = [], vals = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      sets.push(`${f} = $${sets.length + 1}`);
      vals.push(req.body[f]);
    }
  });
  if (!sets.length) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE deals
       SET ${sets.join(', ')}
       WHERE id = $${vals.length}
       RETURNING id AS deal_id,
                 lead_id,
                 assigned_to AS sales_rep_id,
                 value AS deal_value,
                 status AS deal_status,
                 created_at AS deal_date`,
      vals
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// DELETE a deal
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM deals WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/deals/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;
