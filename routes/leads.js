// routes/leads.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads with pagination and filtering
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const leadsQuery = `
      SELECT l.id, l.name, l.status, l.phone, l.email, l.created_at,
             u.name AS sales_rep_name, l.sales_rep_id
      FROM leads l
      LEFT JOIN users u ON l.sales_rep_id = u.id
      WHERE l.name ILIKE $1 OR l.phone ILIKE $1 OR l.email ILIKE $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) FROM leads l
      WHERE l.name ILIKE $1 OR l.phone ILIKE $1 OR l.email ILIKE $1
    `;

    const { rows } = await db.query(leadsQuery, [`%${search}%`, limit, offset]);
    const countResult = await db.query(countQuery, [`%${search}%`]);
    const total = parseInt(countResult.rows[0].count);

    res.json({ data: rows, total });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// GET single lead
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.query(
      `SELECT l.*, u.name AS sales_rep_name
       FROM leads l
       LEFT JOIN users u ON l.sales_rep_id = u.id
       WHERE l.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST create lead
router.post('/', authenticate, async (req, res) => {
  const { name, phone, email, status, sales_rep_id } = req.body;
  try {
    await db.query(
      `INSERT INTO leads (name, phone, email, status, sales_rep_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [name, phone, email, status, sales_rep_id]
    );
    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const { name, phone, email, status, sales_rep_id } = req.body;
  try {
    await db.query(
      `UPDATE leads SET name = $1, phone = $2, email = $3, status = $4, sales_rep_id = $5 WHERE id = $6`,
      [name, phone, email, status, sales_rep_id, id]
    );
    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
