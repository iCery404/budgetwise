const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM debts WHERE user_id = ? ORDER BY (status='active') DESC, created_at DESC",
    [req.user.id]
  );
  res.json(rows);
});

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Give this debt a name."),
    body("total_amount").isFloat({ gt: 0 }).withMessage("Total amount must be greater than 0."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { name, creditor, total_amount, paid_amount, monthly_payment, due_day } = req.body;
    const [result] = await pool.query(
      `INSERT INTO debts (user_id, name, creditor, total_amount, paid_amount, monthly_payment, due_day)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name.trim(), creditor || "", total_amount, paid_amount || 0, monthly_payment || null, due_day || null]
    );
    res.status(201).json({ id: result.insertId, message: "Debt added." });
  }
);

router.post(
  "/:id/pay",
  [body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const [existing] = await pool.query("SELECT * FROM debts WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    if (existing.length === 0) return res.status(404).json({ message: "Debt not found." });

    const debt = existing[0];
    let newPaid = Number(debt.paid_amount) + Number(req.body.amount);
    let status = debt.status;
    if (newPaid >= Number(debt.total_amount)) {
      newPaid = Number(debt.total_amount);
      status = "paid";
    }
    await pool.query("UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?", [newPaid, status, req.params.id]);
    res.json({ message: "Payment recorded." });
  }
);

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM debts WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Debt not found." });

  await pool.query("DELETE FROM debts WHERE id = ?", [req.params.id]);
  res.json({ message: "Debt removed." });
});

module.exports = router;
