const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY name ASC"
  );
  res.json(rows);
});

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Please enter a valid email."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
    body("role").isIn(["admin", "user"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const email = req.body.email.trim().toLowerCase();
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(422).json({ message: "That email is already in use." });
    }

    const hashed = await bcrypt.hash(req.body.password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [req.body.name.trim(), email, hashed, req.body.role]
    );
    res.status(201).json({ id: result.insertId, message: "User created." });
  }
);

router.put("/:id", async (req, res) => {
  const [existing] = await pool.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ message: "User not found." });

  const { name, email, role, password } = req.body;
  const cur = existing[0];

  if (email) {
    const normalized = email.trim().toLowerCase();
    const [dupe] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [
      normalized,
      req.params.id,
    ]);
    if (dupe.length > 0) return res.status(422).json({ message: "That email is already in use." });
  }

  const newPasswordHash = password ? await bcrypt.hash(password, 10) : cur.password;

  await pool.query("UPDATE users SET name=?, email=?, role=?, password=? WHERE id=?", [
    name?.trim() || cur.name,
    email ? email.trim().toLowerCase() : cur.email,
    role || cur.role,
    newPasswordHash,
    req.params.id,
  ]);
  res.json({ message: "User updated." });
});

router.delete("/:id", async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(422).json({ message: "You cannot delete your own account." });
  }
  const [existing] = await pool.query("SELECT * FROM users WHERE id = ?", [req.params.id]);
  if (existing.length === 0) return res.status(404).json({ message: "User not found." });

  await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ message: "User deleted." });
});

module.exports = router;
