import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import App from "../App";

const uniq = Date.now();
const TEST_EMAIL = `tester${uniq}@example.com`;
const TEST_PASSWORD = "password123";

describe("BudgetWise end-to-end flow", () => {
  it("registers, adds a combined income+expense, sees automatic remaining balance, and blocks non-admins", async () => {
    const user = userEvent.setup();

    window.history.pushState({}, "", "/register");
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText("Juan Dela Cruz"), "Test Tester");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), TEST_EMAIL);
    await userEvent.type(screen.getByPlaceholderText("At least 6 characters"), TEST_PASSWORD);
    await userEvent.type(screen.getByPlaceholderText("Re-type password"), TEST_PASSWORD);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText(/showing data for/i)).toBeInTheDocument(), { timeout: 5000 });
    expect(localStorage.getItem("bw_token")).toBeTruthy();
    console.log("STEP 1 OK: registered and on dashboard, token present");

    await user.click(screen.getByRole("link", { name: /transactions & budget/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Transactions & Budget" })).toBeInTheDocument(), { timeout: 5000 });

    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.click(screen.getByRole("button", { name: "Income" }));
    await user.type(screen.getByPlaceholderText("0.00"), "5000");
    let dateInput = document.querySelector('input[type="date"]');
    await user.clear(dateInput);
    await user.type(dateInput, "2026-09-05");
    await user.type(screen.getByPlaceholderText("e.g. Salary for May"), "Test income entry");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Test income entry")).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 2 OK: income added and visible");

    await user.click(screen.getByRole("button", { name: /add transaction/i }));
    await user.click(screen.getByRole("button", { name: "Expense" }));
    await user.type(screen.getByPlaceholderText("0.00"), "1200");
    dateInput = document.querySelector('input[type="date"]');
    await user.clear(dateInput);
    await user.type(dateInput, "2026-09-06");
    await user.type(screen.getByPlaceholderText("e.g. Salary for May"), "Test expense entry");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.getByText("Test expense entry")).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 3 OK: expense added and visible");

    expect(screen.getByText("Test income entry")).toBeInTheDocument();
    expect(screen.getByText("Test expense entry")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("\u20b13,800.00")).toBeInTheDocument();
    });
    console.log("STEP 4 OK: combined list + automatic remaining balance (3,800.00) confirmed");

    expect(screen.queryByRole("link", { name: /user management/i })).not.toBeInTheDocument();

    window.history.pushState({}, "", "/admin/users");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "User Management" })).not.toBeInTheDocument();
    });
    console.log("STEP 5 OK: regular user correctly blocked from admin page");
  }, 30000);
});
