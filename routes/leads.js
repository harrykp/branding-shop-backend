const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all leads with joins
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, 
             c.name AS customer_name, 
             u.name AS sales_rep_name,
             i.name AS industry_name,
             r.name AS referral_source_name
      FROM leads l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.sales_rep_id = u.id
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      ORDER BY l.created_at DESC
    `);

    const leads = result.rows;

    for (const lead of leads) {
      const interestRes = await db.query(
        'SELECT category_id FROM lead_interests WHERE lead_id = $1',
        [lead.id]
      );
      lead.lead_interests = interestRes.rows.map(row => row.category_id);
    }

    res.json(leads);
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
      `SELECT * FROM leads WHERE id = $1`,
      [id]
    );

    const interests = await db.query(
      'SELECT category_id FROM lead_interests WHERE lead_id = $1',
      [id]
    );

    const lead = result.rows[0];
    lead.lead_interests = interests.rows.map(row => row.category_id);

    res.json(lead);
  } catch (err) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// POST new lead
router.post('/', authenticate, async (req, res) => {
  const {
    name,
    email,
    phone,
    website_url,
    status,
    notes,
    priority,
    customer_id,
    sales_rep_id,
    industry_id,
    referral_source_id,
    next_follow_up_at,
    last_contacted_at,
    lead_interests = []
  } = req.body;
  const user_id = req.user.id;

  try {
    await db.query('BEGIN');

    const result = await db.query(
      `INSERT INTO leads 
        (name, email, phone, website_url, status, notes, priority, customer_id, sales_rep_id, industry_id, referral_source_id, next_follow_up_at, last_contacted_at, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        name, email, phone, website_url, status, notes, priority,
        customer_id, sales_rep_id, industry_id, referral_source_id,
        next_follow_up_at || null, last_contacted_at || null, user_id
      ]
    );

    const leadId = result.rows[0].id;

    for (const catId of lead_interests) {
      await db.query(
        'INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)',
        [leadId, catId]
      );
    }

    await db.query('COMMIT');
    res.status(201).json({ message: 'Lead created' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// PUT update lead
router.put('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  const {
    name,
    email,
    phone,
    website_url,
    status,
    notes,
    priority,
    customer_id,
    sales_rep_id,
    industry_id,
    referral_source_id,
    next_follow_up_at,
    last_contacted_at,
    lead_interests = []
  } = req.body;

  try {
    await db.query('BEGIN');

    await db.query(
      `UPDATE leads SET 
        name = $1,
        email = $2,
        phone = $3,
        website_url = $4,
        status = $5,
        notes = $6,
        priority = $7,
        customer_id = $8,
        sales_rep_id = $9,
        industry_id = $10,
        referral_source_id = $11,
        next_follow_up_at = $12,
        last_contacted_at = $13
       WHERE id = $14`,
      [
        name, email, phone, website_url, status, notes, priority,
        customer_id, sales_rep_id, industry_id, referral_source_id,
        next_follow_up_at || null, last_contacted_at || null, id
      ]
    );

    await db.query('DELETE FROM lead_interests WHERE lead_id = $1', [id]);

    for (const catId of lead_interests) {
      await db.query(
        'INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)',
        [id, catId]
      );
    }

    await db.query('COMMIT');
    res.json({ message: 'Lead updated' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// DELETE lead
router.delete('/:id', authenticate, async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM lead_interests WHERE lead_id = $1', [id]);
    await db.query('DELETE FROM leads WHERE id = $1', [id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
