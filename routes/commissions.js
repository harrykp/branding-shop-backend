const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticate } = require("../middleware/auth");

// GET all commissions (paginated & filtered)
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const dataResult = await db.query(
      `SELECT c.*, j.job_name, u.name AS sales_rep_name
       FROM commissions c
       LEFT JOIN jobs j ON c.job_id = j.id
       LEFT JOIN users u ON c.sales_rep_id = u.id
       WHERE j.job_name ILIKE $1
       ORDER BY c.id DESC
       LIMIT $2 OFFSET $3`,
      [`%${search}%`, limit, offset]
    );

    const totalResult = await db.query(
      `SELECT COUNT(*) FROM commissions c
       LEFT JOIN jobs j ON c.job_id = j.id
       WHERE j.job_name ILIKE $1`,
      [`%${search}%`]
    );

    res.json({
      data: dataResult.rows,
      total: parseInt(totalResult.rows[0].count)
    });

  } catch (err) {
    console.error("Error fetching commissions:", err);
    res.status(500).json({ message: "Failed to fetch commissions" });
  }
});


// GET single commission
router.get("/:id", authenticate, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM commissions WHERE id = $1", [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching commission:", err);
    res.status(500).json({ message: "Failed to fetch commission" });
  }
});

// POST commission
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      payment_id, job_id, deal_id, order_id, sales_rep_id, agent_id,
      job_status, job_start_date, job_complete_date, delivery_date,
      commission_rate, comm_lt_15, comm_gt_15, comm_gt_30,
      commission_earned, wht_on_commission, commission_after_wht,
      comm_after_wht_and_sales_tax, commission_status, commission_pay_date,
      unpaid_balance, notes
    } = req.body;

    await db.query(
      `INSERT INTO commissions (
        payment_id, job_id, deal_id, order_id, sales_rep_id, agent_id,
        job_status, job_start_date, job_complete_date, delivery_date,
        commission_rate, comm_lt_15, comm_gt_15, comm_gt_30,
        commission_earned, wht_on_commission, commission_after_wht,
        comm_after_wht_and_sales_tax, commission_status, commission_pay_date,
        unpaid_balance, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22
      )`,
      [
        payment_id, job_id, deal_id, order_id, sales_rep_id, agent_id,
        job_status, job_start_date, job_complete_date, delivery_date,
        commission_rate, comm_lt_15, comm_gt_15, comm_gt_30,
        commission_earned, wht_on_commission, commission_after_wht,
        comm_after_wht_and_sales_tax, commission_status, commission_pay_date,
        unpaid_balance, notes
      ]
    );

    res.status(201).json({ message: "Commission created" });
  } catch (err) {
    console.error("Error creating commission:", err);
    res.status(500).json({ message: "Failed to create commission" });
  }
});

// PUT commission
router.put("/:id", authenticate, async (req, res) => {
  try {
    const {
      payment_id, job_id, deal_id, order_id, sales_rep_id, agent_id,
      job_status, job_start_date, job_complete_date, delivery_date,
      commission_rate, comm_lt_15, comm_gt_15, comm_gt_30,
      commission_earned, wht_on_commission, commission_after_wht,
      comm_after_wht_and_sales_tax, commission_status, commission_pay_date,
      unpaid_balance, notes
    } = req.body;

    await db.query(
      `UPDATE commissions SET
        payment_id=$1, job_id=$2, deal_id=$3, order_id=$4, sales_rep_id=$5, agent_id=$6,
        job_status=$7, job_start_date=$8, job_complete_date=$9, delivery_date=$10,
        commission_rate=$11, comm_lt_15=$12, comm_gt_15=$13, comm_gt_30=$14,
        commission_earned=$15, wht_on_commission=$16, commission_after_wht=$17,
        comm_after_wht_and_sales_tax=$18, commission_status=$19, commission_pay_date=$20,
        unpaid_balance=$21, notes=$22
       WHERE id=$23`,
      [
        payment_id, job_id, deal_id, order_id, sales_rep_id, agent_id,
        job_status, job_start_date, job_complete_date, delivery_date,
        commission_rate, comm_lt_15, comm_gt_15, comm_gt_30,
        commission_earned, wht_on_commission, commission_after_wht,
        comm_after_wht_and_sales_tax, commission_status, commission_pay_date,
        unpaid_balance, notes, req.params.id
      ]
    );

    res.json({ message: "Commission updated" });
  } catch (err) {
    console.error("Error updating commission:", err);
    res.status(500).json({ message: "Failed to update commission" });
  }
});

// DELETE commission
router.delete("/:id", authenticate, async (req, res) => {
  try {
    await db.query("DELETE FROM commissions WHERE id = $1", [req.params.id]);
    res.json({ message: "Commission deleted" });
  } catch (err) {
    console.error("Error deleting commission:", err);
    res.status(500).json({ message: "Failed to delete commission" });
  }
});

module.exports = router;
