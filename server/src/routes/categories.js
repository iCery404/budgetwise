const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { type } = req.query;
  let sql = "SELECT * FROM categories WHERE user_id = ?";
  const params = [req.user.id];
  if (type === "income" || type === "expense") {
    sql += " AND type = ?";
    params.push(type);
  }
  sql += " ORDER BY name ASC";
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Category name is required."),
    body("type").isIn(["income", "expense"]).withMessage("Type must be income or expense."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { name, type, color } = req.body;
    const [result] = await pool.query(
      "INSERT INTO categories (user_id, name, type, color) VALUES (?, ?, ?, ?)",
      [req.user.id, name.trim(), type, color || "#5B8A72"]
    );
    res.status(201).json({ id: result.insertId, user_id: req.user.id, name, type, color });
  }
);

router.put("/:id", async (req, res) => {
  const { name, type, color } = req.body;
  const [existing] = await pool.query("SELECT * FROM categories WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Category not found." });

  await pool.query("UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?", [
    name?.trim() || existing[0].name,
    type || existing[0].type,
    color || existing[0].color,
    req.params.id,
  ]);
  res.json({ message: "Category updated." });
});

router.delete("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM categories WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  if (existing.length === 0) return res.status(404).json({ message: "Category not found." });

  await pool.query("DELETE FROM categories WHERE id = ?", [req.params.id]);
  res.json({ message: "Category deleted." });
});

module.exports = router;
