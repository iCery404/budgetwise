const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

async function seedDefaultCategories(userId) {
  const defaults = [
    ["Groceries", "expense", "#6B9A7C"],
    ["Transportation", "expense", "#A8C5D4"],
    ["Utilities", "expense", "#C99A5B"],
    ["Dining", "expense", "#D4A5A5"],
    ["Other", "expense", "#8BA888"],
    ["Salary", "income", "#45705A"],
    ["Freelance", "income", "#6B9A7C"],
    ["Allowance", "income", "#8BA888"],
  ];
  const values = defaults.map(([name, type, color]) => [userId, name, type, color]);
  await pool.query(
    "INSERT INTO categories (user_id, name, type, color) VALUES ?",
    [values]
  );
}

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("Please enter a valid email."),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(422).json({ message: "An account with that email already exists." });
    }

    const role = normalizedEmail === "admin@budgetwise.test" ? "admin" : "user";
    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name.trim(), normalizedEmail, hashed, role]
    );

    await seedDefaultCategories(result.insertId);

    const user = { id: result.insertId, name: name.trim(), email: normalizedEmail, role };
    const token = signToken(user);
    res.status(201).json({ token, user });
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ message: errors.array()[0].msg });
    }

    const email = req.body.email.trim().toLowerCase();
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: "Those credentials do not match our records." });
    }

    const dbUser = rows[0];
    const match = await bcrypt.compare(req.body.password, dbUser.password);
    if (!match) {
      return res.status(401).json({ message: "Those credentials do not match our records." });
    }

    const user = { id: dbUser.id, name: dbUser.name, email: dbUser.email, role: dbUser.role };
    const token = signToken(user);
    res.json({ token, user });
  }
);

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
