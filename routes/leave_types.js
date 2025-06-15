// routes/leave_types.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// GET all leave types
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM leave_types ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leave types:', err);
    res.status(500).json({ message: 'Failed to load leave types' });
  }
});

// GET single leave type
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM leave_types WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching leave type:', err);
    res.status(500).json({ message: 'Failed to fetch leave type' });
  }
});

// CREATE leave type
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.query(
      'INSERT INTO leave_types (name, description, created_at) VALUES ($1, $2, NOW())',
      [name, description]
    );
    res.status(201).json({ message: 'Leave type created' });
  } catch (err) {
    console.error('Error creating leave type:', err);
    res.status(500).json({ message: 'Failed to create leave type' });
  }
});

// UPDATE leave type
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description } = req.body;
    await db.query(
      'UPDATE leave_types SET name=$1, description=$2 WHERE id=$3',
      [name, description, req.params.id]
    );
    res.json({ message: 'Leave type updated' });
  } catch (err) {
    console.error('Error updating leave type:', err);
    res.status(500).json({ message: 'Failed to update leave type' });
  }
});

// DELETE leave type
router.delete('/:id', authenticate, async (req, res) => {
  try {
    await db.query('DELETE FROM leave_types WHERE id = $1', [req.params.id]);
    res.json({ message: 'Leave type deleted' });
  } catch (err) {
    console.error('Error deleting leave type:', err);
    res.status(500).json({ message: 'Failed to delete leave type' });
  }
});

module.exports = router;
