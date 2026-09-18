# What's new in this update

This adds the features that were requested on top of the existing app
(profile requests, top navbar, theme are already in the base project).

## New features

1. **Recurring transactions** - Transactions page > "Recurring Transactions"
   panel. Add a rule (e.g. Rent, day 1) and it auto-generates a real
   transaction the first time you view a month it hasn't run for yet.
   Safe to call repeatedly - it never duplicates a month it already generated.
2. **Savings goals** - new "Goals" page. Create a goal, add funds to it over
   time, progress bar fills in.
3. **Budget alerts** - Dashboard now shows a dismissible banner when any
   category is at 70%+ (near) or 90%+ (over) of its budget, instead of only
   showing it in the progress bar.
4. **CSV export** - Reports page > "Download CSV" gives a real .csv file of
   that period's transactions (not just Print).
5. **Trend chart** - Dashboard now has an income-vs-expense line chart for
   the last 6 months.
6. **Better Transactions filters** - search by description, filter by
   category, on top of the existing month/date-range picker.
7. **Payment method balances** - Dashboard "Payment Method Balances" section:
   running total per payment method (Cash, GCash, etc.), computed from all
   transactions ever logged with that method.
8. **Dark mode** - moon/sun toggle in the header, persists across reloads.
9. **Admin analytics** - new "Analytics" page (admin only): totals across
   every user, most common expense categories system-wide, most active
   users.
10. **Debts & installments** - new "Debts" page. Add a debt, log payments
    against it, auto-marks "Paid" once fully paid off.

## Setting up the database

If this is a fresh install, just run the whole `server/schema.sql` file as
before - it now includes the new tables plus a `recurring_id` column on
`transactions`.

If you already have a `budgetwise` database from before this update, you
can run the same `schema.sql` again - the new tables use
`CREATE TABLE IF NOT EXISTS` and the new column uses
`ADD COLUMN IF NOT EXISTS`, so it won't touch your existing data. If your
MySQL/MariaDB version is old enough that `ADD COLUMN IF NOT EXISTS` isn't
supported, just drop and recreate your dev database from the full file
instead (typical for a school project, not real user data).

**Gotcha we ran into while testing:** on Debian/Ubuntu, MariaDB's `root`
user often uses socket auth by default, which works fine from the `mysql`
CLI but gets "Access denied for user 'root'@'localhost'" when Node's
`mysql2` driver connects over TCP. If you hit that, create a normal
SQL user instead and point `server/.env` at it:

```sql
CREATE USER 'bwapp'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON budgetwise.* TO 'bwapp'@'localhost';
FLUSH PRIVILEGES;
```

```
DB_USER=bwapp
DB_PASSWORD=yourpassword
```

## New API endpoints

- `GET/POST /api/recurring`, `DELETE /api/recurring/:id`, `POST /api/recurring/run`
- `GET/POST /api/goals`, `POST /api/goals/:id/contribute`, `DELETE /api/goals/:id`
- `GET/POST /api/debts`, `POST /api/debts/:id/pay`, `DELETE /api/debts/:id`
- `GET /api/analytics` (admin only)
- `GET /api/reports/export?month=&year=` (CSV download)
- `GET /api/transactions` now also accepts `?search=` and `?category_id=`
- `GET /api/dashboard` response now also includes `trend`, `alerts`, and `wallets`

## Testing it yourself

`server/integration_test.js` is a plain Node script (no dependencies beyond
what's already installed) that exercises every endpoint above against a
running server + database - registers a user and an admin, creates a
transaction/budget/goal/debt/recurring rule, checks the dashboard alerts and
wallet math, exports a CSV, and runs the profile-request approval flow.
Start your server, make sure the database is migrated, then run:

```
cd server
node integration_test.js
```

It prints `OK`/`FAIL` per check and a pass/fail count at the end. Every
check passed when this update was put together, run against a real
MariaDB database end to end - so if something fails on your machine, it's
almost always a setup issue (wrong DB credentials, server not running,
schema not migrated) rather than the code itself.
