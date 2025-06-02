// routes/customers.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Get all customers (with optional search + pagination)
router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    const searchTerm = `%${search.toLowerCase()}%`;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `SELECT c.*, u.name AS sales_rep_name 
         FROM customers c 
         LEFT JOIN users u ON c.sales_rep_id = u.id
         WHERE LOWER(c.name) LIKE $1 OR LOWER(c.email) LIKE $1
         ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
        [searchTerm, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) FROM customers 
         WHERE LOWER(name) LIKE $1 OR LOWER(email) LIKE $1`,
        [searchTerm]
      )
    ]);

    res.json({ data: dataResult.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Create new customer
router.post('/', auth.verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, company, user_id, sales_rep_id } = req.body;
    await db.query(
      `INSERT INTO customers (name, email, phone, address, company, user_id, sales_rep_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, phone, address, company, user_id || null, sales_rep_id || null]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Update customer
router.put('/:id', auth.verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, company, user_id, sales_rep_id } = req.body;
    await db.query(
      `UPDATE customers 
       SET name=$1, email=$2, phone=$3, address=$4, company=$5, user_id=$6, sales_rep_id=$7
       WHERE id = $8`,
      [name, email, phone, address, company, user_id || null, sales_rep_id || null, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Delete customer
router.delete('/:id', auth.verifyToken, async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
