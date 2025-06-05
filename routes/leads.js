// routes/leads.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads?page=1&limit=10&search=term
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const leadsQuery = `
      SELECT * FROM leads
      WHERE name ILIKE $1 OR company ILIKE $1 OR position ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const countQuery = `
      SELECT COUNT(*) FROM leads
      WHERE name ILIKE $1 OR company ILIKE $1 OR position ILIKE $1
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
  try {
    const result = await db.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST create new lead
router.post('/', authenticate, async (req, res) => {
  const {
    name, company, position, industry, referral_source,
    priority, last_contacted_at, next_follow_up_at,
    notes, converted
  } = req.body;

  try {
    await db.query(
      `INSERT INTO leads 
        (name, company, position, industry, referral_source, priority, 
         last_contacted_at, next_follow_up_at, notes, converted, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        name, company, position, industry, referral_source,
        priority, last_contacted_at, next_follow_up_at,
        notes, converted
      ]
    );
    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', authenticate, async (req, res) => {
  const {
    name, company, position, industry, referral_source,
    priority, last_contacted_at, next_follow_up_at,
    notes, converted
  } = req.body;

  try {
    await db.query(
      `UPDATE leads SET 
         name=$1, company=$2, position=$3, industry=$4, referral_source=$5,
         priority=$6, last_contacted_at=$7, next_follow_up_at=$8,
         notes=$9, converted=$10, updated_at=NOW()
       WHERE id=$11`,
      [
        name, company, position, industry, referral_source,
        priority, last_contacted_at, next_follow_up_at,
        notes, converted, req.params.id
      ]
    );
    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
