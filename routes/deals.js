const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Helper for optional pagination and search
function buildQuery(baseQuery, searchTerm, offset, limit) {
  let where = '';
  const params = [];

  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    where = `WHERE d.status ILIKE $${params.length} OR c.name ILIKE $${params.length}`;
  }

  const query = `
    ${baseQuery}
    ${where}
    ORDER BY d.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  return { query, params: [...params, limit, offset] };
}

// GET all deals with joins and pagination
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  const baseQuery = `
    SELECT d.*, 
           l.name AS lead_name,
           q.status AS quote_status,
           c.name AS customer_name,
           u.name AS sales_rep_name,
           a.name AS assigned_to_name,
           dept.name AS department_name
    FROM deals d
    LEFT JOIN leads l ON d.lead_id = l.id
    LEFT JOIN quotes q ON d.quote_id = q.id
    LEFT JOIN customers c ON d.customer_id = c.id
    LEFT JOIN users u ON d.sales_rep_id = u.id
    LEFT JOIN users a ON d.assigned_to = a.id
    LEFT JOIN departments dept ON d.department_id = dept.id
  `;

  try {
    const { query, params } = buildQuery(baseQuery, search, offset, limit);
    const dealsRes = await db.query(query, params);
    const totalRes = await db.query('SELECT COUNT(*) FROM deals');
    res.json({
      data: dealsRes.rows,
      total: parseInt(totalRes.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching deals:', err);
    res.status(500).json({ message: 'Failed to fetch deals' });
  }
});

// GET single deal with joined data
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.query(`
      SELECT d.*, 
             l.name AS lead_name,
             q.status AS quote_status,
             c.name AS customer_name,
             u.name AS sales_rep_name,
             a.name AS assigned_to_name,
             dept.name AS department_name
      FROM deals d
      LEFT JOIN leads l ON d.lead_id = l.id
      LEFT JOIN quotes q ON d.quote_id = q.id
      LEFT JOIN customers c ON d.customer_id = c.id
      LEFT JOIN users u ON d.sales_rep_id = u.id
      LEFT JOIN users a ON d.assigned_to = a.id
      LEFT JOIN departments dept ON d.department_id = dept.id
      WHERE d.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching deal:', err);
    res.status(500).json({ message: 'Failed to fetch deal' });
  }
});

// POST create new deal
router.post('/', authenticate, async (req, res) => {
  const {
    lead_id, quote_id, customer_id, sales_rep_id, assigned_to,
    value, status, stage, expected_close_date, closed_at,
    department_id, notes
  } = req.body;

  const user_id = req.user.id;

  try {
    const result = await db.query(`
      INSERT INTO deals (
        lead_id, quote_id, customer_id, sales_rep_id, assigned_to, value, status,
        stage, expected_close_date, closed_at, department_id, notes, user_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      RETURNING id
    `, [
      lead_id, quote_id, customer_id, sales_rep_id, assigned_to,
      value, status, stage, expected_close_date, closed_at,
      department_id, notes, user_id
    ]);

    res.status(201).json({ message: 'Deal created', id: result.rows[0].id });
  } catch (err) {
    console.error('Error creating deal:', err);
    res.status(500).json({ message: 'Failed to create deal' });
  }
});

// PUT update deal
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    lead_id, quote_id, customer_id, sales_rep_id, assigned_to,
    value, status, stage, expected_close_date, closed_at,
    department_id, notes
  } = req.body;

  try {
    await db.query(`
      UPDATE deals SET
        lead_id = $1,
        quote_id = $2,
        customer_id = $3,
        sales_rep_id = $4,
        assigned_to = $5,
        value = $6,
        status = $7,
        stage = $8,
        expected_close_date = $9,
        closed_at = $10,
        department_id = $11,
        notes = $12
      WHERE id = $13
    `, [
      lead_id, quote_id, customer_id, sales_rep_id, assigned_to,
      value, status, stage, expected_close_date, closed_at,
      department_id, notes, id
    ]);

    res.json({ message: 'Deal updated' });
  } catch (err) {
    console.error('Error updating deal:', err);
    res.status(500).json({ message: 'Failed to update deal' });
  }
});

// DELETE deal
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM deals WHERE id = $1', [id]);
    res.json({ message: 'Deal deleted' });
  } catch (err) {
    console.error('Error deleting deal:', err);
    res.status(500).json({ message: 'Failed to delete deal' });
  }
});

module.exports = router;
