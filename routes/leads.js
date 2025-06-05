// routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads?page=1&limit=10&search=
router.get('/', authenticate, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const search = `%${req.query.search || ''}%`;

  try {
    const query = `
      SELECT l.*, i.name AS industry, r.name AS referral_source,
             ARRAY(
               SELECT c.name
               FROM lead_interests li
               JOIN product_categories c ON li.category_id = c.id
               WHERE li.lead_id = l.id
             ) AS interested_in
      FROM leads l
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      WHERE l.name ILIKE $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const count = await db.query(`SELECT COUNT(*) FROM leads WHERE name ILIKE $1`, [search]);
    const results = await db.query(query, [search, limit, offset]);

    res.json({ data: results.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const leadQuery = `
      SELECT * FROM leads WHERE id = $1
    `;
    const leadRes = await db.query(leadQuery, [id]);
    const lead = leadRes.rows[0];

    const interestRes = await db.query(
      `SELECT category_id FROM lead_interests WHERE lead_id = $1`,
      [id]
    );
    lead.interested_in = interestRes.rows.map(row => row.category_id);

    res.json(lead);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST /api/leads
router.post('/', authenticate, async (req, res) => {
  const {
    name, company, position, email, phone, website_url,
    industry_id, referral_source_id, priority,
    last_contacted_at, next_follow_up_at, notes, converted,
    interested_in = []
  } = req.body;

  try {
    const insertLead = `
      INSERT INTO leads (name, company, position, email, phone, website_url,
        industry_id, referral_source_id, priority, last_contacted_at,
        next_follow_up_at, notes, converted)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id
    `;
    const leadRes = await db.query(insertLead, [
      name, company, position, email, phone, website_url,
      industry_id, referral_source_id, priority,
      last_contacted_at, next_follow_up_at, notes, converted
    ]);
    const leadId = leadRes.rows[0].id;

    for (const categoryId of interested_in) {
      await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [leadId, categoryId]);
    }

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
    name, company, position, email, phone, website_url,
    industry_id, referral_source_id, priority,
    last_contacted_at, next_follow_up_at, notes, converted,
    interested_in = []
  } = req.body;

  try {
    const updateLead = `
      UPDATE leads
      SET name=$1, company=$2, position=$3, email=$4, phone=$5, website_url=$6,
          industry_id=$7, referral_source_id=$8, priority=$9,
          last_contacted_at=$10, next_follow_up_at=$11, notes=$12, converted=$13
      WHERE id = $14
    `;
    await db.query(updateLead, [
      name, company, position, email, phone, website_url,
      industry_id, referral_source_id, priority,
      last_contacted_at, next_follow_up_at, notes, converted, id
    ]);

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    for (const categoryId of interested_in) {
      await db.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [id, categoryId]);
    }

    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    await db.query(`DELETE FROM leads WHERE id = $1`, [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
