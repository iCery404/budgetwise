const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  // Without this, mysql2 returns DECIMAL columns (all money amounts, since
  // SUM(amount) etc. are DECIMAL) as strings instead of numbers, to avoid
  // silent precision loss. That's fine almost everywhere because JS coerces
  // strings for *, /, and comparisons - but Pie chart math (and any other
  // code that does string + string) breaks silently. This makes every
  // DECIMAL come back as a real number app-wide.
  decimalNumbers: true,
});

module.exports = pool;
