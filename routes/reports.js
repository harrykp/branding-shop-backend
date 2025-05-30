// branding-shop-backend/routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. Sales Overview
router.get('/sales/overview', async (req, res) => {
  try {
    const revenueResult = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_revenue,
             COUNT(*) AS total_orders
      FROM orders
      WHERE status != 'cancelled'
    `);

    const topProducts = await db.query(`
      SELECT p.name, SUM(oi.quantity) AS total_sold
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      GROUP BY p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    res.json({
      revenue: revenueResult.rows[0],
      top_products: topProducts.rows
    });
  } catch (err) {
    console.error("sales/overview error:", err);
    res.status(500).json({ message: "Error fetching sales overview." });
  }
});

// 2. Sales Timeseries
router.get('/sales/timeseries', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DATE(created_at) AS date,
             SUM(total_amount) AS revenue,
             COUNT(*) AS orders
      FROM orders
      WHERE status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("sales/timeseries error:", err);
    res.status(500).json({ message: "Error fetching timeseries data." });
  }
});

// 3. Order Status Counts
router.get('/orders/status', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM orders
      GROUP BY status
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("orders/status error:", err);
    res.status(500).json({ message: "Error fetching order status stats." });
  }
});

// 4. Payment Gateway Summary
router.get('/payments/gateways', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT gateway, COUNT(*) AS count, SUM(amount) AS total
      FROM payments
      GROUP BY gateway
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("payments/gateways error:", err);
    res.status(500).json({ message: "Error fetching payment gateway data." });
  }
});

// 5. Deal Pipeline Overview
router.get('/deals/pipeline', async (req, res) => {
  try {
    const leads = await db.query(`SELECT COUNT(*) FROM leads`);
    const deals = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM deals
      GROUP BY status
    `);
    res.json({
      total_leads: parseInt(leads.rows[0].count),
      deal_stages: deals.rows
    });
  } catch (err) {
    console.error("deals/pipeline error:", err);
    res.status(500).json({ message: "Error fetching deal pipeline." });
  }
});

module.exports = router;
