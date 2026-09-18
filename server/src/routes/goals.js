const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );
  res.json(rows);
});

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Give this goal a name."),
    body("target_amount").isFloat({ gt: 0 }).withMessage("Target amount must be greater than 0."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { name, target_amount, current_amount, target_date } = req.body;
    const [result] = await pool.query(
      "INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, name.trim(), target_amount, current_amount || 0, target_date || null]
    );
    res.status(201).json({ id: result.insertId, message: "Goal created." });
  }
);

router.post(
  "/:id/contribute",
  [body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0.")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const [existing] = await pool.query("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    if (existing.length === 0) return res.status(404).json({ message: "Goal not found." });

    await pool.query("UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ?", [
      req.body.amount,
      req.params.id,
    ]);
    res.json({ message: "Funds added." });
  }
);

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Goal not found." });

  await pool.query("DELETE FROM savings_goals WHERE id = ?", [req.params.id]);
  res.json({ message: "Goal removed." });
});

module.exports = router;
