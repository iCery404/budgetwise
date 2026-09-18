const BASE = "http://127.0.0.1:4000/api";
let passed = 0, failed = 0;

function ok(label, cond, extra) {
  if (cond) { passed++; console.log(`  OK  ${label}`); }
  else { failed++; console.log(`FAIL  ${label}` + (extra ? ` -> ${extra}` : "")); }
}

async function req(method, path, body, token, isBlob) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = isBlob ? await res.text() : await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  const uniq = Date.now();
  const userEmail = `tester${uniq}@example.com`;
  const adminEmail = "admin@budgetwise.test";

  // ---------- Register regular user ----------
  let r = await req("POST", "/auth/register", { name: "Test User", email: userEmail, password: "password123" });
  ok("register regular user -> 201", r.status === 201, JSON.stringify(r.data));
  const userToken = r.data.token;
  ok("register returns token", !!userToken);
  ok("register returns role=user", r.data.user.role === "user");

  // ---------- Register/login admin ----------
  r = await req("POST", "/auth/register", { name: "Admin Test", email: adminEmail, password: "password123" });
  let adminToken;
  if (r.status === 201) {
    adminToken = r.data.token;
    ok("register admin -> role=admin", r.data.user.role === "admin");
  } else {
    r = await req("POST", "/auth/login", { email: adminEmail, password: "password123" });
    adminToken = r.data.token;
    ok("login existing admin -> 200", r.status === 200, JSON.stringify(r.data));
  }
  ok("have admin token", !!adminToken);

  // ---------- Categories (seeded defaults) ----------
  r = await req("GET", "/categories", null, userToken);
  ok("GET categories -> array with defaults", Array.isArray(r.data) && r.data.length > 0, JSON.stringify(r.data));
  const expenseCat = r.data.find((c) => c.type === "expense");
  const incomeCat = r.data.find((c) => c.type === "income");
  ok("has an expense category", !!expenseCat);
  ok("has an income category", !!incomeCat);

  // ---------- Transactions: create + search + filter ----------
  const now = new Date();
  const month = now.getMonth() + 1, year = now.getFullYear();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-10`;

  r = await req("POST", "/transactions", {
    type: "expense", amount: 500, date: dateStr, description: "Grocery run for testing",
    category_id: expenseCat.id, payment_method: "GCash",
  }, userToken);
  ok("create transaction -> 201", r.status === 201, JSON.stringify(r.data));

  r = await req("POST", "/transactions", {
    type: "income", amount: 10000, date: dateStr, description: "Freelance payout",
    category_id: incomeCat.id, payment_method: "Bank Transfer",
  }, userToken);
  ok("create income transaction -> 201", r.status === 201, JSON.stringify(r.data));

  r = await req("GET", `/transactions?search=Grocery`, null, userToken);
  ok("search filter finds matching description", r.data.length === 1 && r.data[0].description.includes("Grocery"), JSON.stringify(r.data));

  r = await req("GET", `/transactions?category_id=${expenseCat.id}`, null, userToken);
  ok("category_id filter returns only that category", r.data.every((t) => t.category_id === expenseCat.id), JSON.stringify(r.data));

  r = await req("GET", `/transactions?from=${year}-${String(month).padStart(2,"0")}-01&to=${year}-${String(month).padStart(2,"0")}-28`, null, userToken);
  ok("date range filter returns transactions", r.data.length >= 2, JSON.stringify(r.data));

  // ---------- Budgets ----------
  r = await req("POST", "/budgets", { category_id: expenseCat.id, amount: 600, month, year }, userToken);
  ok("create budget -> 201", r.status === 201, JSON.stringify(r.data));

  // ---------- Dashboard: trend, alerts, wallets ----------
  r = await req("GET", `/dashboard?month=${month}&year=${year}`, null, userToken);
  ok("dashboard 200", r.status === 200, JSON.stringify(r.data));
  ok("dashboard has trend array", Array.isArray(r.data.trend));
  ok("dashboard has alerts array", Array.isArray(r.data.alerts));
  ok("dashboard alerts flags the 500/600 budget (83%) as near", r.data.alerts.some((a) => a.category_name === expenseCat.name && a.level === "near"), JSON.stringify(r.data.alerts));
  ok("dashboard has wallets array", Array.isArray(r.data.wallets));
  ok("dashboard wallets include GCash", r.data.wallets.some((w) => w.payment_method === "GCash"), JSON.stringify(r.data.wallets));
  const gcashWallet = r.data.wallets.find((w) => w.payment_method === "GCash");
  ok("GCash wallet balance is -500 (one expense so far)", gcashWallet && Number(gcashWallet.balance) === -500, JSON.stringify(gcashWallet));

  // ---------- Recurring transactions ----------
  r = await req("POST", "/recurring", {
    type: "expense", amount: 8500, description: "Rent", day_of_month: 1,
    category_id: expenseCat.id, payment_method: "Bank Transfer",
  }, userToken);
  ok("create recurring rule -> 201", r.status === 201, JSON.stringify(r.data));

  // Run it for a future month it hasn't generated for yet
  let futureMonth = month + 1, futureYear = year;
  if (futureMonth > 12) { futureMonth = 1; futureYear++; }
  r = await req("POST", "/recurring/run", { month: futureMonth, year: futureYear }, userToken);
  ok("recurring/run generates 1 transaction", r.data.generated === 1, JSON.stringify(r.data));

  r = await req("GET", `/transactions?from=${futureYear}-${String(futureMonth).padStart(2,"0")}-01&to=${futureYear}-${String(futureMonth).padStart(2,"0")}-28`, null, userToken);
  ok("generated recurring transaction appears with (auto) suffix", r.data.some((t) => t.description.includes("Rent") && t.description.includes("auto")), JSON.stringify(r.data));

  // Run again for the SAME month - should be idempotent (no duplicate)
  r = await req("POST", "/recurring/run", { month: futureMonth, year: futureYear }, userToken);
  ok("recurring/run is idempotent on re-run (generated: 0)", r.data.generated === 0, JSON.stringify(r.data));

  // ---------- Savings goals ----------
  r = await req("POST", "/goals", { name: "New Laptop", target_amount: 50000, current_amount: 0 }, userToken);
  ok("create goal -> 201", r.status === 201, JSON.stringify(r.data));
  const goalId = r.data.id;

  r = await req("POST", `/goals/${goalId}/contribute`, { amount: 5000 }, userToken);
  ok("contribute to goal -> 200", r.status === 200, JSON.stringify(r.data));

  r = await req("GET", "/goals", null, userToken);
  const goal = r.data.find((g) => g.id === goalId);
  ok("goal current_amount reflects contribution (5000)", goal && Number(goal.current_amount) === 5000, JSON.stringify(goal));

  // ---------- Debts ----------
  r = await req("POST", "/debts", { name: "Credit Card", total_amount: 3000, paid_amount: 0 }, userToken);
  ok("create debt -> 201", r.status === 201, JSON.stringify(r.data));
  const debtId = r.data.id;

  r = await req("POST", `/debts/${debtId}/pay`, { amount: 1000 }, userToken);
  ok("make debt payment -> 200", r.status === 200, JSON.stringify(r.data));

  r = await req("POST", `/debts/${debtId}/pay`, { amount: 2500 }, userToken); // overpay past total on purpose
  ok("overpaying clamps and marks paid -> 200", r.status === 200, JSON.stringify(r.data));

  r = await req("GET", "/debts", null, userToken);
  const debt = r.data.find((d) => d.id === debtId);
  ok("debt fully paid and clamped to total (3000)", debt && debt.status === "paid" && Number(debt.paid_amount) === 3000, JSON.stringify(debt));

  // ---------- Reports CSV export ----------
  r = await req("GET", `/reports/export?month=${month}&year=${year}`, null, userToken, true);
  ok("CSV export returns text with header row", typeof r.data === "string" && r.data.includes("Date") && r.data.includes("Amount"), r.data && r.data.slice(0, 100));
  ok("CSV export includes our test transaction", r.data.includes("Grocery run for testing"));

  // ---------- Profile change request flow ----------
  r = await req("POST", "/profile/request", { name: "Test User Renamed" }, userToken);
  ok("regular user profile edit -> creates pending request (201)", r.status === 201, JSON.stringify(r.data));

  r = await req("GET", "/profile-requests", null, adminToken);
  ok("admin sees pending profile request", Array.isArray(r.data) && r.data.some((pr) => pr.requested_name === "Test User Renamed"), JSON.stringify(r.data));
  const reqId = r.data.find((pr) => pr.requested_name === "Test User Renamed")?.id;

  r = await req("POST", `/profile-requests/${reqId}/approve`, {}, adminToken);
  ok("admin approves profile request -> 200", r.status === 200, JSON.stringify(r.data));

  // ---------- Admin: users CRUD ----------
  r = await req("GET", "/users", null, adminToken);
  ok("admin GET users -> array", Array.isArray(r.data) && r.data.some((u) => u.email === userEmail), JSON.stringify(r.data).slice(0, 200));

  // ---------- Admin analytics ----------
  r = await req("GET", "/analytics", null, adminToken);
  ok("analytics 200", r.status === 200, JSON.stringify(r.data));
  ok("analytics has totalUsers >= 2", r.data.totalUsers >= 2, JSON.stringify(r.data));
  ok("analytics has topCategories array", Array.isArray(r.data.topCategories));
  ok("analytics has totalOutstandingDebt = 0 (debt fully paid)", Number(r.data.totalOutstandingDebt) === 0, JSON.stringify(r.data));
  ok("analytics has totalSaved = 5000", Number(r.data.totalSaved) === 5000, JSON.stringify(r.data));

  r = await req("GET", "/analytics", null, userToken);
  ok("non-admin blocked from analytics (403 or 401)", r.status === 403 || r.status === 401, r.status);

  // ---------- Cleanup helpers work (delete) ----------
  r = await req("DELETE", `/goals/${goalId}`, null, userToken);
  ok("delete goal -> 200", r.status === 200, JSON.stringify(r.data));
  r = await req("DELETE", `/debts/${debtId}`, null, userToken);
  ok("delete debt -> 200", r.status === 200, JSON.stringify(r.data));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("SCRIPT ERROR:", err); process.exit(1); });
