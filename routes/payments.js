const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

// GET paginated + filtered payments
router.get("/", authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    const searchQuery = `%${search.toLowerCase()}%`;

    const totalRes = await db.query("SELECT COUNT(*) FROM payments");
    const total = parseInt(totalRes.rows[0].count);

    const dataRes = await db.query(
      `SELECT p.*, j.job_name, u.name AS received_by_name, c.name AS customer_name
       FROM payments p
       LEFT JOIN jobs j ON p.job_id = j.id
       LEFT JOIN users u ON p.received_by = u.id
       LEFT JOIN customers c ON p.customer_id = c.id
       WHERE LOWER(COALESCE(p.payment_name, '')) LIKE $1
       ORDER BY p.payment_date DESC
       LIMIT $2 OFFSET $3`,
      [searchQuery, limit, offset]
    );

    res.json({ data: dataRes.rows, total });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// GET one payment
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM payments WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching payment:", err);
    res.status(500).json({ message: "Failed to fetch payment" });
  }
});

// CREATE payment
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      payment_name, job_id, customer_id, amount, payment_type,
      method, payment_date, delivery_date, exempt, wht_amount,
      received_by, notes, order_id, gateway, transaction_id
    } = req.body;

    const created_by = req.user.userId;

    await db.query(
      `INSERT INTO payments (
        payment_name, job_id, customer_id, amount, payment_type,
        method, payment_date, delivery_date, exempt, wht_amount,
        received_by, created_by, notes, order_id, gateway, transaction_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16
      )`,
      [
        payment_name, job_id, customer_id, amount, payment_type,
        method, payment_date, delivery_date, exempt, wht_amount,
        received_by, created_by, notes, order_id, gateway, transaction_id
      ]
    );

    res.status(201).json({ message: "Payment created" });
  } catch (err) {
    console.error("Error creating payment:", err);
    res.status(500).json({ message: "Failed to create payment" });
  }
});

// UPDATE payment
router.put("/:id", authenticate, async (req, res) => {
  try {
    const {
      payment_name, job_id, customer_id, amount, payment_type,
      method, payment_date, delivery_date, exempt, wht_amount,
      received_by, notes, order_id, gateway, transaction_id
    } = req.body;

    await db.query(
      `UPDATE payments SET
        payment_name=$1, job_id=$2, customer_id=$3, amount=$4, payment_type=$5,
        method=$6, payment_date=$7, delivery_date=$8, exempt=$9, wht_amount=$10,
        received_by=$11, notes=$12, order_id=$13, gateway=$14, transaction_id=$15
       WHERE id=$16`,
      [
        payment_name, job_id, customer_id, amount, payment_type,
        method, payment_date, delivery_date, exempt, wht_amount,
        received_by, notes, order_id, gateway, transaction_id, req.params.id
      ]
    );

    res.json({ message: "Payment updated" });
  } catch (err) {
    console.error("Error updating payment:", err);
    res.status(500).json({ message: "Failed to update payment" });
  }
});

// DELETE payment
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.query("DELETE FROM payments WHERE id = $1", [req.params.id]);
    res.json({ message: "Payment deleted" });
  } catch (err) {
    console.error("Error deleting payment:", err);
    res.status(500).json({ message: "Failed to delete payment" });
  }
});

module.exports = router;
