const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { type, from, to, search, category_id } = req.query;
  let sql = `
    SELECT t.*, c.name AS category_name, c.color AS category_color
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ?
  `;
  const params = [req.user.id];

  if (type === "income" || type === "expense") {
    sql += " AND t.type = ?";
    params.push(type);
  }
  if (from) {
    sql += " AND t.date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND t.date <= ?";
    params.push(to);
  }
  if (category_id) {
    sql += " AND t.category_id = ?";
    params.push(category_id);
  }
  if (search) {
    sql += " AND t.description LIKE ?";
    params.push(`%${search}%`);
  }
  sql += " ORDER BY t.date DESC, t.id DESC";

  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.post(
  "/",
  [
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense."),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0."),
    body("date").isISO8601().withMessage("Please provide a valid date."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { type, category_id, amount, date, description, payment_method } = req.body;
    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, date, description, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id || null, type, amount, date, description || "", payment_method || ""]
    );
    res.status(201).json({ id: result.insertId, message: "Transaction saved." });
  }
);

router.put("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Transaction not found." });

  const cur = existing[0];
  const { type, category_id, amount, date, description, payment_method } = req.body;

  if (amount !== undefined && Number(amount) <= 0) {
    return res.status(422).json({ message: "Amount must be greater than 0." });
  }

  await pool.query(
    `UPDATE transactions SET type=?, category_id=?, amount=?, date=?, description=?, payment_method=? WHERE id=?`,
    [
      type || cur.type,
      category_id !== undefined ? category_id : cur.category_id,
      amount !== undefined ? amount : cur.amount,
      date || cur.date,
      description !== undefined ? description : cur.description,
      payment_method !== undefined ? payment_method : cur.payment_method,
      req.params.id,
    ]
  );
  res.json({ message: "Transaction updated." });
});

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM transactions WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Transaction not found." });

  await pool.query("DELETE FROM transactions WHERE id = ?", [req.params.id]);
  res.json({ message: "Transaction deleted." });
});

module.exports = router;
