const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, c.name AS category_name, c.color AS category_color
     FROM recurring_transactions r
     LEFT JOIN categories c ON c.id = r.category_id
     WHERE r.user_id = ?
     ORDER BY r.day_of_month ASC`,
    [req.user.id]
  );
  res.json(rows);
});

router.post(
  "/",
  [
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0."),
    body("day_of_month").isInt({ min: 1, max: 28 }).withMessage("Day must be between 1 and 28."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { type, category_id, amount, description, payment_method, day_of_month } = req.body;
    const [result] = await pool.query(
      `INSERT INTO recurring_transactions (user_id, category_id, type, amount, description, payment_method, day_of_month)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id || null, type, amount, description || "", payment_method || "", day_of_month]
    );
    res.status(201).json({ id: result.insertId, message: "Recurring rule added." });
  }
);

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Recurring rule not found." });

  await pool.query("DELETE FROM recurring_transactions WHERE id = ?", [req.params.id]);
  res.json({ message: "Recurring rule removed." });
});

router.post("/run", async (req, res) => {
  const month = parseInt(req.body.month);
  const year = parseInt(req.body.year);
  if (!month || !year) return res.status(422).json({ message: "month and year are required." });

  const [rules] = await pool.query(
    "SELECT * FROM recurring_transactions WHERE user_id = ? AND active = 1",
    [req.user.id]
  );
  if (rules.length === 0) return res.json({ generated: 0 });

  let generated = 0;
  for (const r of rules) {
    const [already] = await pool.query(
      "SELECT id FROM transactions WHERE recurring_id = ? AND MONTH(date) = ? AND YEAR(date) = ?",
      [r.id, month, year]
    );
    if (already.length > 0) continue;

    const day = Math.min(Math.max(r.day_of_month, 1), 28);
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, date, description, payment_method, recurring_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, r.category_id, r.type, r.amount, date, `${r.description || ""} (auto)`.trim(), r.payment_method || "", r.id]
    );
    generated++;
  }
  res.json({ generated });
});

module.exports = router;
