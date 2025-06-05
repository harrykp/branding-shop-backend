// routes/leads.js

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/leads?page=1&limit=10&search=
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const leadsQuery = `
      SELECT l.*, 
             u.name AS created_by_name,
             i.name AS industry_name,
             r.name AS referral_source_name,
             (
               SELECT json_agg(pc.name) 
               FROM lead_interests li
               JOIN product_categories pc ON li.category_id = pc.id
               WHERE li.lead_id = l.id
             ) AS interested_categories
      FROM leads l
      LEFT JOIN users u ON l.created_by = u.id
      LEFT JOIN industries i ON l.industry_id = i.id
      LEFT JOIN referral_sources r ON l.referral_source_id = r.id
      WHERE l.name ILIKE $1 OR l.email ILIKE $1
      ORDER BY l.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `SELECT COUNT(*) FROM leads WHERE name ILIKE $1 OR email ILIKE $1`;
    const { rows } = await db.query(leadsQuery, [`%${search}%`, limit, offset]);
    const countResult = await db.query(countQuery, [`%${search}%`]);

    res.json({ data: rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  const {
    name, email, phone, website_url, status = 'new',
    industry_id, referral_source_id, interested_in = []
  } = req.body;
  const created_by = req.user.id;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const insertLead = `
      INSERT INTO leads (name, email, phone, website_url, status, created_by, industry_id, referral_source_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const { rows } = await client.query(insertLead, [name, email, phone, website_url, status, created_by, industry_id, referral_source_id]);
    const leadId = rows[0].id;

    for (const category_id of interested_in) {
      await client.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [leadId, category_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Lead created', id: leadId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating lead:', err);
    res.status(500).json({ message: 'Failed to create lead' });
  } finally {
    client.release();
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  const {
    name, email, phone, website_url, status,
    industry_id, referral_source_id, interested_in = []
  } = req.body;
  const { id } = req.params;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const updateQuery = `
      UPDATE leads
      SET name=$1, email=$2, phone=$3, website_url=$4, status=$5, industry_id=$6, referral_source_id=$7
      WHERE id=$8
    `;
    await client.query(updateQuery, [name, email, phone, website_url, status, industry_id, referral_source_id, id]);

    await client.query(`DELETE FROM lead_interests WHERE lead_id = $1`, [id]);
    for (const category_id of interested_in) {
      await client.query(`INSERT INTO lead_interests (lead_id, category_id) VALUES ($1, $2)`, [id, category_id]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Lead updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating lead:', err);
    res.status(500).json({ message: 'Failed to update lead' });
  } finally {
    client.release();
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM leads WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    console.error('Error deleting lead:', err);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

module.exports = router;
