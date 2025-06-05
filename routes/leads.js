// routes/leads.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/leads
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, i.name AS industry_name, r.name AS referral_source_name,
             ARRAY_AGG(c.name) AS interests
      FROM leads l
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      LEFT JOIN lead_interests li ON l.id = li.lead_id
      LEFT JOIN product_categories c ON li.category_id = c.id
      GROUP BY l.id, i.name, r.name
      ORDER BY l.created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id
router.get('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    const leadResult = await db.query(
      `SELECT * FROM leads WHERE id = $1`,
      [id]
    );

    const interestsResult = await db.query(
      `SELECT category_id FROM lead_interests WHERE lead_id = $1`,
      [id]
    );

    if (!leadResult.rows.length) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const lead = leadResult.rows[0];
    lead.interests = interestsResult.rows.map(row => row.category_id);

    res.json(lead);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST /api/leads
router.post('/', authenticate, async (req, res) => {
  const {
    name, email, phone, website_url, company, position, priority,
    industry_id, referral_source_id, notes,
    last_contacted_at, next_follow_up_at, converted, interests
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO leads (name, email, phone, website_url, company, position, priority,
                          industry_id, referral_source_id, notes, last_contacted_at,
                          next_follow_up_at, converted)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [name, email, phone, website_url, company, position, priority,
       industry_id, referral_source_id, notes, last_contacted_at,
       next_follow_up_at, converted]
    );
    const leadId = result.rows[0].id;

    if (Array.isArray(interests)) {
      for (const catId of interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [leadId, catId]
        );
      }
    }

    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    name, email, phone, website_url, company, position, priority,
    industry_id, referral_source_id, notes,
    last_contacted_at, next_follow_up_at, converted, interests
  } = req.body;

  try {
    await db.query(
      `UPDATE leads SET name = $1, email = $2, phone = $3, website_url = $4, 
        company = $5, position = $6, priority = $7, industry_id = $8,
        referral_source_id = $9, notes = $10, last_contacted_at = $11,
        next_follow_up_at = $12, converted = $13
       WHERE id = $14`,
      [name, email, phone, website_url, company, position, priority,
       industry_id, referral_source_id, notes, last_contacted_at,
       next_follow_up_at, converted, id]
    );

    await db.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);

    if (Array.isArray(interests)) {
      for (const catId of interests) {
        await db.query(
          `INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`,
          [id, catId]
        );
      }
    }

    res.json({ message: 'Lead updated' });
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
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
