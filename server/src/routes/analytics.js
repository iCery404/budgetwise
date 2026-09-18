const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const year = parseInt(req.query.year) || now.getFullYear();

  const [[userCounts]] = await pool.query(
    `SELECT COUNT(*) AS totalUsers, SUM(role='admin') AS totalAdmins FROM users`
  );

  const [[txCounts]] = await pool.query(
    `SELECT COUNT(*) AS totalTransactions,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS totalIncomeAllTime,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS totalExpenseAllTime
     FROM transactions`
  );

  const [[thisMonth]] = await pool.query(
    `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS totalExpense,
        COUNT(*) AS txThisMonth
     FROM transactions WHERE MONTH(date) = ? AND YEAR(date) = ?`,
    [month, year]
  );

  const [topCategories] = await pool.query(
    `SELECT c.name, COUNT(*) AS uses, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense'
     GROUP BY c.name
     ORDER BY total DESC
     LIMIT 5`
  );

  const [mostActiveUsers] = await pool.query(
    `SELECT u.name, u.email, COUNT(t.id) AS txCount
     FROM users u LEFT JOIN transactions t ON t.user_id = u.id
     GROUP BY u.id, u.name, u.email
     ORDER BY txCount DESC
     LIMIT 5`
  );

  const [[goalStats]] = await pool.query(
    `SELECT COUNT(*) AS totalGoals, COALESCE(SUM(current_amount),0) AS totalSaved FROM savings_goals`
  );
  const [[debtStats]] = await pool.query(
    `SELECT COUNT(*) AS totalDebts, COALESCE(SUM(total_amount-paid_amount),0) AS totalOutstanding
     FROM debts WHERE status='active'`
  );

  res.json({
    month,
    year,
    totalUsers: userCounts.totalUsers,
    totalAdmins: Number(userCounts.totalAdmins) || 0,
    totalTransactions: txCounts.totalTransactions,
    totalIncomeAllTime: Number(txCounts.totalIncomeAllTime),
    totalExpenseAllTime: Number(txCounts.totalExpenseAllTime),
    thisMonth: {
      totalIncome: Number(thisMonth.totalIncome),
      totalExpense: Number(thisMonth.totalExpense),
      txThisMonth: thisMonth.txThisMonth,
    },
    topCategories,
    mostActiveUsers,
    totalGoals: goalStats.totalGoals,
    totalSaved: Number(goalStats.totalSaved),
    totalDebts: debtStats.totalDebts,
    totalOutstandingDebt: Number(debtStats.totalOutstanding),
  });
});

module.exports = router;
