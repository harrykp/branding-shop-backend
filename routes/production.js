// branding-shop-backend/routes/production.js

const router = require('express').Router();
const db = require('../db');

/**
 * GET /api/jobs
 * Supports pagination, sorting, and optional filtering.
 * Query params:
 *   page (default 1), limit (default 20)
 *   sort_by (allowed: due_date, id, start_date, status), sort_dir (ASC|DESC)
 */
router.get('/', async (req, res) => {
  try {
    // Parse and validate query params
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 20;
    let sortBy = req.query.sort_by || 'due_date';
    let sortDir = (req.query.sort_dir || 'ASC').toUpperCase();
    const allowedSort = ['due_date', 'id', 'start_date', 'status'];
    if (!allowedSort.includes(sortBy)) sortBy = 'due_date';
    if (!['ASC', 'DESC'].includes(sortDir)) sortDir = 'ASC';
    const offset = (page - 1) * limit;

    // Main query with pagination and sorting
    const sql = `
      SELECT
        j.id,
        j.order_id,
        o.status            AS order_status,
        j.type,
        j.qty,
        j.status            AS job_status,
        j.assigned_to,
        u.name              AS assignee_name,
        j.start_date,
        j.due_date,
        j.started_at,
        j.finished_at
      FROM jobs j
      LEFT JOIN orders o ON o.id = j.order_id
      LEFT JOIN users u ON u.id = j.assigned_to
      ORDER BY j.${sortBy} ${sortDir}, j.id DESC
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await db.query(sql, [limit, offset]);
    res.json({ page, limit, jobs: rows });
  } catch (err) {
    console.error('GET /api/jobs error', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/jobs/:id
 * Fetch a single production job by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         id,
         order_id,
         type,
         qty,
         status      AS job_status,
         assigned_to,
         start_date,
         due_date,
         started_at,
         finished_at
       FROM jobs
       WHERE id = $1`,
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
 * Create a new production job
 */
router.post('/', async (req, res) => {
  const { order_id = null, type, qty, assigned_to = null, due_date = null } = req.body;
  if (!type || !qty) {
    return res.status(400).json({ error: 'Missing required fields: type, qty' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO jobs
         (order_id, type, qty, assigned_to, status, start_date, due_date)
       VALUES ($1, $2, $3, $4, 'queued', NOW(), $5)
       RETURNING *`,
      [order_id, type, qty, assigned_to, due_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/jobs error', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

/**
 * PATCH /api/jobs/:id
 * Update one or more fields on a job
 */
router.patch('/:id', async (req, res) => {
  const updatable = ['status', 'assigned_to', 'due_date', 'started_at', 'finished_at'];
  const sets = [];
  const vals = [];

  updatable.forEach(field => {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = $${sets.length + 1}`);
      vals.push(req.body[field]);
    }
  });

  if (!sets.length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  vals.push(req.params.id);

  try {
    const { rows } = await db.query(
      `UPDATE jobs
         SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${vals.length}
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
 * Remove a job
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM jobs WHERE id = $1`,
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Job not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error(`DELETE /api/jobs/${req.params.id} error`, err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

/**
 * POST /api/jobs/push/:dealId
 * Push a deal into production as a job, with role-based access
 */
router.post('/push/:dealId', async (req, res) => {
  try {
    // 1) Check user roles
    const { rows: userRoles } = await db.query(
      `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1`,
      [req.user.id]
    );
    const roles = userRoles.map(r => r.name);
    const allowed = ['employee','sales_rep','manager','chief_executive','system_admin','super_admin'];
    if (!roles.some(r => allowed.includes(r))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // 2) Fetch the deal
    const { rows: deals } = await db.query(
      `SELECT id, quote_id, assigned_to FROM deals WHERE id = $1`,
      [req.params.dealId]
    );
    if (!deals[0]) return res.status(404).json({ error: 'Deal not found' });
    const deal = deals[0];

    // 3) Get quote quantity
    const { rows: quotes } = await db.query(
      `SELECT quantity FROM quotes WHERE id = $1`,
      [deal.quote_id]
    );
    const qty = quotes[0]?.quantity || 0;

    // 4) Determine assignee
    const assignedTo = deal.assigned_to || req.user.id;

    // 5) Insert production job
    const { rows: jobRows } = await db.query(
      `INSERT INTO jobs
         (order_id, type, qty, assigned_to, start_date, due_date, status)
       VALUES (NULL, 'production', $1, $2, NOW(), NOW() + INTERVAL '1 day', 'queued')
       RETURNING *`,
      [qty, assignedTo]
    );

    res.status(201).json(jobRows[0]);
  } catch (err) {
    console.error('POST /api/jobs/push/:dealId error', err);
    res.status(500).json({ error: 'Failed to push to production' });
  }
});

module.exports = router;
