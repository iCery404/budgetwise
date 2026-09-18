const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();
  const userId = req.user.id;

  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS totalIncome,
       COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS totalExpense
     FROM transactions WHERE user_id=? AND MONTH(date)=? AND YEAR(date)=?`,
    [userId, month, year]
  );

  const [byCategory] = await pool.query(
    `SELECT c.name, COUNT(*) AS count, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id=? AND t.type='expense' AND MONTH(t.date)=? AND YEAR(t.date)=?
     GROUP BY c.id, c.name ORDER BY total DESC`,
    [userId, month, year]
  );

  const [budgetVsActual] = await pool.query(
    `SELECT c.name AS category_name, b.amount AS budget,
        COALESCE((SELECT SUM(t.amount) FROM transactions t
          WHERE t.user_id=b.user_id AND t.category_id=b.category_id AND t.type='expense'
            AND MONTH(t.date)=b.month AND YEAR(t.date)=b.year), 0) AS spent
     FROM budgets b JOIN categories c ON c.id=b.category_id
     WHERE b.user_id=? AND b.month=? AND b.year=?`,
    [userId, month, year]
  );

  const totalIncome = Number(totals.totalIncome);
  const totalExpense = Number(totals.totalExpense);

  res.json({
    month, year,
    totalIncome, totalExpense,
    netBalance: totalIncome - totalExpense,
    byCategory,
    budgetVsActual,
  });
});

router.get("/export", async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const [rows] = await pool.query(
    `SELECT t.date, t.description, c.name AS category_name, t.type, t.payment_method, t.amount
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND MONTH(t.date) = ? AND YEAR(t.date) = ?
     ORDER BY t.date DESC, t.id DESC`,
    [req.user.id, month, year]
  );

  const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Date", "Description", "Category", "Type", "Payment Method", "Amount"];
  const lines = [header.map(escapeCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.date).toISOString().slice(0, 10),
        r.description || "",
        r.category_name || "Uncategorized",
        r.type,
        r.payment_method || "",
        r.amount,
      ]
        .map(escapeCell)
        .join(",")
    );
  }
  const csv = "\uFEFF" + lines.join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="budgetwise-${year}-${String(month).padStart(2, "0")}.csv"`
  );
  res.send(csv);
});

module.exports = router;
