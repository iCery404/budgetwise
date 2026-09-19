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
     FROM transactions
     WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?`,
    [userId, month, year]
  );

  const totalIncome = Number(totals.totalIncome);
  const totalExpense = Number(totals.totalExpense);
  const remaining = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;

  const [categoryBreakdownRaw] = await pool.query(
    `SELECT c.name, c.color, SUM(t.amount) AS total
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = 'expense' AND MONTH(t.date) = ? AND YEAR(t.date) = ?
     GROUP BY c.id, c.name, c.color
     ORDER BY total DESC`,
    [userId, month, year]
  );
  const categoryExpenseSum = categoryBreakdownRaw.reduce((s, c) => s + Number(c.total), 0);
  const categoryBreakdown = categoryBreakdownRaw.map((c) => ({
    name: c.name,
    color: c.color,
    total: Number(c.total),
    pct: categoryExpenseSum > 0 ? Math.round((Number(c.total) / categoryExpenseSum) * 1000) / 10 : 0,
  }));

  const [budgetProgress] = await pool.query(
    `SELECT b.id, c.name AS category_name, b.amount AS budget,
        COALESCE((
          SELECT SUM(t.amount) FROM transactions t
          WHERE t.user_id = b.user_id AND t.category_id = b.category_id
            AND t.type = 'expense' AND MONTH(t.date)=b.month AND YEAR(t.date)=b.year
        ), 0) AS spent
     FROM budgets b JOIN categories c ON c.id = b.category_id
     WHERE b.user_id = ? AND b.month = ? AND b.year = ?
     ORDER BY c.name ASC`,
    [userId, month, year]
  );

  const [recentTransactions] = await pool.query(
    `SELECT t.*, c.name AS category_name
     FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ?
     ORDER BY t.date DESC, t.id DESC
     LIMIT 8`,
    [userId]
  );

  const alerts = budgetProgress
    .map((b) => ({ ...b, pct: b.budget > 0 ? Math.round((b.spent / b.budget) * 100) : 0 }))
    .filter((b) => b.pct >= 70)
    .map((b) => ({
      category_name: b.category_name,
      pct: b.pct,
      level: b.pct >= 90 ? "over" : "near",
    }));

  const [trendRows] = await pool.query(
    `SELECT YEAR(date) AS yr, MONTH(date) AS mo,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
     FROM transactions
     WHERE user_id = ? AND date >= DATE_SUB(LAST_DAY(?), INTERVAL 6 MONTH)
     GROUP BY YEAR(date), MONTH(date)
     ORDER BY yr ASC, mo ASC`,
    [userId, `${year}-${String(month).padStart(2, "0")}-01`]
  );
  const trend = trendRows.map((r) => ({
    month: r.mo,
    year: r.yr,
    income: Number(r.income),
    expense: Number(r.expense),
  }));

  const [walletsRaw] = await pool.query(
    `SELECT payment_method,
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) AS moneyIn,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) AS moneyOut
     FROM transactions
     WHERE user_id = ? AND payment_method IS NOT NULL AND payment_method != ''
       AND MONTH(date) = ? AND YEAR(date) = ?
     GROUP BY payment_method
     ORDER BY payment_method ASC`,
    [userId, month, year]
  );
  const [walletLimitRows] = await pool.query(
    `SELECT payment_method, credit_limit FROM wallet_limits WHERE user_id = ?`,
    [userId]
  );
  const limitByMethod = Object.fromEntries(
    walletLimitRows.map((r) => [r.payment_method, Number(r.credit_limit)])
  );
  const activityByMethod = Object.fromEntries(
    walletsRaw.map((w) => [w.payment_method, { moneyIn: Number(w.moneyIn), moneyOut: Number(w.moneyOut) }])
  );
  // Always show the standard wallets, even with no activity this period, plus any
  // custom payment method that was actually used or has a limit configured.
  const STANDARD_METHODS = ["Cash", "GCash", "Bank Transfer", "Credit Card", "Debit Card"];
  const methodNames = Array.from(
    new Set([...STANDARD_METHODS, ...Object.keys(activityByMethod), ...Object.keys(limitByMethod)])
  );
  const wallets = methodNames.map((payment_method) => {
    const { moneyIn, moneyOut } = activityByMethod[payment_method] || { moneyIn: 0, moneyOut: 0 };
    const creditLimit = limitByMethod[payment_method];
    return {
      payment_method,
      moneyIn,
      moneyOut,
      balance: moneyIn - moneyOut,
      creditLimit: creditLimit != null ? creditLimit : null,
      available: creditLimit != null ? creditLimit - moneyOut : null,
    };
  });

  res.json({
    totalIncome,
    totalExpense,
    remaining,
    savingsRate,
    categoryBreakdown,
    budgetProgress,
    recentTransactions,
    alerts,
    trend,
    wallets,
  });
});

module.exports = router;
