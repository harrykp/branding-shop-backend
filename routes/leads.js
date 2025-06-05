// routes/leads.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads - with pagination & search
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = req.query.search || '';

  try {
    const leadsQuery = `
      SELECT * FROM leads
      WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM leads
      WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1
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

// GET /api/leads/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST /api/leads
router.post('/', authenticate, async (req, res) => {
  const {
    name, email, phone, company, position,
    industry, referral_source, notes, priority,
    last_contacted_at, next_follow_up_at, converted
  } = req.body;

  try {
    await db.query(`
      INSERT INTO leads (
        name, email, phone, company, position, industry,
        referral_source, notes, priority, last_contacted_at,
        next_follow_up_at, converted
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [
      name, email, phone, company, position, industry,
      referral_source, notes, priority, last_contacted_at,
      next_follow_up_at, converted
    ]);
    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const {
    name, email, phone, company, position,
    industry, referral_source, notes, priority,
    last_contacted_at, next_follow_up_at, converted
  } = req.body;

  try {
    await db.query(`
      UPDATE leads SET
        name = $1,
        email = $2,
        phone = $3,
        company = $4,
        position = $5,
        industry = $6,
        referral_source = $7,
        notes = $8,
        priority = $9,
        last_contacted_at = $10,
        next_follow_up_at = $11,
        converted = $12
      WHERE id = $13
    `, [
      name, email, phone, company, position,
      industry, referral_source, notes, priority,
      last_contacted_at, next_follow_up_at, converted, id
    ]);
    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
