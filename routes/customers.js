// routes/customers.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all customers with pagination and search
router.get('/', async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const customersQuery = `
      SELECT c.*, u.name AS sales_rep_name
      FROM customers c
      LEFT JOIN users u ON c.sales_rep_id = u.id
      WHERE c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const customers = await db.query(customersQuery, [`%${search}%`, limit, offset]);

    const countQuery = `SELECT COUNT(*) FROM customers WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1`;
    const countResult = await db.query(countQuery, [`%${search}%`]);

    res.json({
      customers: customers.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error('Error loading customers:', err);
    res.status(500).json({ error: 'Failed to load customers' });
  }
});

// Get single customer by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  const { name, email, phone, company, sales_rep_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO customers (name, email, phone, company, sales_rep_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, company, sales_rep_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, sales_rep_id } = req.body;
  try {
    const result = await db.query(
      'UPDATE customers SET name = $1, email = $2, phone = $3, company = $4, sales_rep_id = $5 WHERE id = $6 RETURNING *',
      [name, email, phone, company, sales_rep_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
