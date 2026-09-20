const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT pr.id, pr.requested_name, pr.requested_email, pr.request_type, pr.status, pr.created_at,
            u.id AS user_id, u.name AS current_name, u.email AS current_email
     FROM profile_requests pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.status = 'pending'
     ORDER BY pr.created_at ASC`
  );
  res.json(rows);
});

router.post("/:id/approve", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM profile_requests WHERE id = ? AND status = 'pending'", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: "Request not found or already handled." });
  const reqRow = rows[0];

  const [[user]] = await pool.query("SELECT * FROM users WHERE id = ?", [reqRow.user_id]);
  if (!user) return res.status(404).json({ message: "That user no longer exists." });

  if (reqRow.request_type === "delete") {
    await pool.query("DELETE FROM users WHERE id = ?", [user.id]);
    await pool.query("UPDATE profile_requests SET status='approved', reviewed_at=NOW() WHERE id=?", [req.params.id]);
    return res.json({ message: "Approved. The account has been deleted." });
  }

  if (reqRow.requested_email) {
    const [dupe] = await pool.query("SELECT id FROM users WHERE email = ? AND id != ?", [reqRow.requested_email, user.id]);
    if (dupe.length > 0) {
      return res.status(422).json({ message: "Cannot approve: that email is now used by another account." });
    }
  }

  await pool.query("UPDATE users SET name=?, email=? WHERE id=?", [
    reqRow.requested_name || user.name,
    reqRow.requested_email || user.email,
    user.id,
  ]);
  await pool.query("UPDATE profile_requests SET status='approved', reviewed_at=NOW() WHERE id=?", [req.params.id]);

  res.json({ message: "Approved. The change is now live." });
});

router.post("/:id/reject", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM profile_requests WHERE id = ? AND status = 'pending'", [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: "Request not found or already handled." });

  await pool.query("UPDATE profile_requests SET status='rejected', reviewed_at=NOW() WHERE id=?", [req.params.id]);
  res.json({ message: "Request declined." });
});

module.exports = router;
