const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const [rows] = await pool.query(
    `SELECT b.*, c.name AS category_name, c.color AS category_color,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.user_id = b.user_id AND t.category_id = b.category_id
            AND t.type = 'expense'
            AND MONTH(t.date) = b.month AND YEAR(t.date) = b.year
        ), 0) AS spent
     FROM budgets b
     LEFT JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? AND b.month = ? AND b.year = ?
     ORDER BY c.name ASC`,
    [req.user.id, month, year]
  );
  res.json(rows);
});

router.post(
  "/",
  [
    body("category_id").isInt().withMessage("Please select a category."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0."),
    body("month").isInt({ min: 1, max: 12 }),
    body("year").isInt({ min: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { category_id, amount, month, year } = req.body;
    try {
      const [result] = await pool.query(
        "INSERT INTO budgets (user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?)",
        [req.user.id, category_id, amount, month, year]
      );
      res.status(201).json({ id: result.insertId, message: "Budget set." });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(422).json({ message: "A budget for this category and period already exists." });
      }
      throw err;
    }
  }
);

router.put("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM budgets WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Budget not found." });

  const { amount } = req.body;
  if (amount !== undefined && Number(amount) <= 0) {
    return res.status(422).json({ message: "Amount must be greater than 0." });
  }
  await pool.query("UPDATE budgets SET amount = ? WHERE id = ?", [amount, req.params.id]);
  res.json({ message: "Budget updated." });
});

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM budgets WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Budget not found." });

  await pool.query("DELETE FROM budgets WHERE id = ?", [req.params.id]);
  res.json({ message: "Budget deleted." });
});

module.exports = router;
