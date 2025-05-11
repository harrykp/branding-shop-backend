// branding-shop-backend/routes/production.js

const router = require('express').Router();
const db     = require('../db');

/**
 * GET /api/jobs
 * Supports pagination, sorting, and optional filtering by job_status via query params.
 * Returns a plain array of job objects.
 */
router.get('/', async (req, res) => {
  try {
    // parse query params
    const page   = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit  = Math.max(1, parseInt(req.query.limit, 10) || 20);
    let sortBy   = req.query.sort_by || 'due_date';
    let sortDir  = (req.query.sort_dir || 'ASC').toUpperCase();
    const status = req.query.status;

    const allowedSort = ['due_date', 'id', 'start_date'];
    if (!allowedSort.includes(sortBy)) sortBy = 'due_date';
    if (!['ASC', 'DESC'].includes(sortDir)) sortDir = 'ASC';

    const offset = (page - 1) * limit;

    // if filtering by status, include WHERE
    const statusClause = status ? 'WHERE j.status = $3' : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const sql = `
      SELECT
        j.id,
        j.deal_id,
        d.value                     AS deal_value,
        j.order_id,
        ord.user_id                 AS customer_id,
        cust.name                   AS customer_name,
        cust.phone_number           AS customer_phone,
        ord.total                   AS order_total,
        ord.payment_status,
        q.product_id,
        prd.name                    AS product_name,
        prd.sku                     AS product_code,
        j.qty                       AS qty_ordered,
        j.completed_qty             AS qty_completed,
        ROUND(
          CASE WHEN j.qty>0 THEN (j.completed_qty::numeric/j.qty)*100 ELSE 0 END
        ,2)                          AS pct_complete,
        j.start_date,
        j.due_date,
        j.started_at,
        j.finished_at,
        j.comments,
        upd.name                    AS updated_by_name,
        j.updated_at,
        j.status                    AS job_status,
        j.assigned_to,
        assignee.name               AS assignee_name,
        ROUND((j.completed_qty::numeric * (ord.total/NULLIF(q.quantity,0))),2) AS completed_value,
        ROUND((ord.total - (j.completed_qty::numeric * (ord.total/NULLIF(q.quantity,0)))),2) AS balance_unpaid
      FROM jobs j
      LEFT JOIN deals   d ON j.deal_id      = d.id
      LEFT JOIN orders ord ON j.order_id     = ord.id
      LEFT JOIN users  cust ON ord.user_id    = cust.id
      LEFT JOIN quotes q ON ord.quote_id     = q.id
      LEFT JOIN products prd ON q.product_id  = prd.id
      LEFT JOIN users  assignee ON j.assigned_to = assignee.id
      LEFT JOIN users  upd ON j.updated_by    = upd.id
      ${statusClause}
      ORDER BY j.${sortBy} ${sortDir}, j.id DESC
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/jobs error', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/jobs/:id
 * Fetch a single job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         j.id,
         j.deal_id,
         d.value                    AS deal_value,
         j.order_id,
         ord.user_id                AS customer_id,
         cust.name                  AS customer_name,
         cust.phone_number          AS customer_phone,
         ord.total                  AS order_total,
         ord.payment_status,
         q.product_id,
         prd.name                   AS product_name,
         prd.sku                    AS product_code,
         j.qty                      AS qty_ordered,
         j.completed_qty            AS qty_completed,
         ROUND(
           CASE WHEN j.qty>0 THEN (j.completed_qty::numeric/j.qty)*100 ELSE 0 END
         ,2)                          AS pct_complete,
         j.start_date,
         j.due_date,
         j.started_at,
         j.finished_at,
         j.comments,
         upd.name                    AS updated_by_name,
         j.updated_at,
         j.status                    AS job_status,
         j.assigned_to,
         assignee.name               AS assignee_name,
         ROUND((j.completed_qty::numeric * (ord.total/NULLIF(q.quantity,0))),2) AS completed_value,
         ROUND((ord.total - (j.completed_qty::numeric * (ord.total/NULLIF(q.quantity,0)))),2) AS balance_unpaid
       FROM jobs j
       LEFT JOIN deals   d ON j.deal_id      = d.id
       LEFT JOIN orders ord ON j.order_id     = ord.id
       LEFT JOIN users  cust ON ord.user_id    = cust.id
       LEFT JOIN quotes q ON ord.quote_id     = q.id
       LEFT JOIN products prd ON q.product_id  = prd.id
       LEFT JOIN users  assignee ON j.assigned_to = assignee.id
       LEFT JOIN users  upd ON j.updated_by    = upd.id
       WHERE j.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * POST /api/jobs
 * Create a new job
 */
router.post('/', async (req, res) => {
  const { order_id = null, deal_id = null, type, qty, assigned_to = null, due_date = null } = req.body;
  if (!type || !qty) {
    return res.status(400).json({ error: 'Missing required fields: type or qty' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO jobs
         (order_id, deal_id, type, qty, assigned_to, status, start_date, due_date)
       VALUES ($1,$2,$3,$4,$5,'queued',NOW(),$6)
       RETURNING *`,
      [order_id, deal_id, type, qty, assigned_to, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/jobs error', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * PATCH /api/jobs/:id
 * Update job fields
 */
router.patch('/:id', async (req, res) => {
  const updatable = ['status','assigned_to','due_date','started_at','finished_at','completed_qty','comments','updated_by'];
  const sets = [];
  const vals = [];
  updatable.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field}=$${sets.length+1}`);
      vals.push(req.body[field]);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE jobs
         SET ${sets.join(',')}, updated_at=NOW()
       WHERE id=$${vals.length}
       RETURNING *`,
      vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

/**
 * DELETE /api/jobs/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM jobs WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Job not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * POST /api/jobs/push/:dealId
 */
router.post('/push/:dealId', async (req, res) => {
  try {
    // assume auth middleware ensures valid user
    const { rows: deals } = await db.query(
      `SELECT id, quote_id, assigned_to FROM deals WHERE id=$1`,
      [req.params.dealId]
    );
    if (!deals[0]) return res.status(404).json({ error: 'Deal not found' });
    const deal = deals[0];
    const { rows: q } = await db.query(`SELECT quantity FROM quotes WHERE id=$1`, [deal.quote_id]);
    const qty = q[0]?.quantity || 0;
    const assignedTo = deal.assigned_to || req.user.id;
    const { rows: jobRows } = await db.query(
      `INSERT INTO jobs
         (order_id, deal_id, type, qty, assigned_to, status, start_date, due_date)
       VALUES (NULL,$1,'production',$2,$3,'queued',NOW(),NOW()+INTERVAL '1 day') RETURNING *`,
      [deal.id, qty, assignedTo]
    );
    res.status(201).json(jobRows[0]);
  } catch (err) {
    console.error('POST /api/jobs/push/:dealId error', err);
    res.status(500).json({ error: 'Failed to push to production' });
  }
});

module.exports = router;
