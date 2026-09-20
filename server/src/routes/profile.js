const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const [[me]] = await pool.query(
    "SELECT id, name, email, role, birthday, sex, created_at FROM users WHERE id = ?",
    [req.user.id]
  );
  const [pending] = await pool.query(
    "SELECT id, requested_name, requested_email, request_type, status, created_at FROM profile_requests WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
    [req.user.id]
  );
  res.json({ user: me, pendingRequest: pending[0] || null });
});

router.post(
  "/request",
  [
    body("name").optional({ checkFalsy: true }).trim().notEmpty(),
    body("email").optional({ checkFalsy: true }).isEmail().withMessage("Please enter a valid email."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { name, email } = req.body;
    if (!name && !email) {
      return res.status(422).json({ message: "Please change at least one field." });
    }

    if (email) {
      const normalized = email.trim().toLowerCase();
      const [dupe] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [normalized, req.user.id]);
      if (dupe.length > 0) return res.status(422).json({ message: "That email is already in use." });
    }

    await pool.query("DELETE FROM profile_requests WHERE user_id = ? AND status = 'pending'", [req.user.id]);

    if (req.user.role === "admin") {
      const [[cur]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
      await pool.query("UPDATE users SET name=?, email=? WHERE id=?", [
        name ? name.trim() : cur.name,
        email ? email.trim().toLowerCase() : cur.email,
        req.user.id,
      ]);
      await pool.query(
        "INSERT INTO profile_requests (user_id, requested_name, requested_email, status, reviewed_at) VALUES (?, ?, ?, 'approved', NOW())",
        [req.user.id, name || null, email ? email.trim().toLowerCase() : null]
      );
      return res.json({ message: "Profile updated.", autoApplied: true });
    }

    await pool.query(
      "INSERT INTO profile_requests (user_id, requested_name, requested_email) VALUES (?, ?, ?)",
      [req.user.id, name ? name.trim() : null, email ? email.trim().toLowerCase() : null]
    );
    res.status(201).json({ message: "Change request submitted. An admin needs to approve it before it takes effect.", autoApplied: false });
  }
);

router.put(
  "/password",
  [
    body("currentPassword").notEmpty().withMessage("Enter your current password."),
    body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 6 characters."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    const match = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!match) return res.status(422).json({ message: "Your current password is incorrect." });

    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.user.id]);
    res.json({ message: "Password changed." });
  }
);

router.delete("/request/:id", async (req, res) => {
  const [existing] = await pool.query(
    "SELECT * FROM profile_requests WHERE id = ? AND user_id = ? AND status = 'pending'",
    [req.params.id, req.user.id]
  );
  if (existing.length === 0) return res.status(404).json({ message: "Request not found." });
  await pool.query("DELETE FROM profile_requests WHERE id = ?", [req.params.id]);
  res.json({ message: "Request canceled." });
});

router.put(
  "/details",
  [
    body("birthday").optional({ checkFalsy: true }).isISO8601().withMessage("Please enter a valid date."),
    body("sex").optional({ checkFalsy: true }).isIn(["male", "female", "other", "prefer_not"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg });

    const { birthday, sex } = req.body;
    await pool.query("UPDATE users SET birthday = ?, sex = ? WHERE id = ?", [
      birthday || null,
      sex || null,
      req.user.id,
    ]);
    res.json({ message: "Details saved." });
  }
);

router.post("/delete-request", async (req, res) => {
  await pool.query("DELETE FROM profile_requests WHERE user_id = ? AND status = 'pending'", [req.user.id]);
  await pool.query(
    "INSERT INTO profile_requests (user_id, request_type) VALUES (?, 'delete')",
    [req.user.id]
  );
  res.status(201).json({ message: "Deletion requested. An admin needs to approve it before your account is removed." });
});

module.exports = router;
