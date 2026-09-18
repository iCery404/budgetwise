import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import App from "../App";

const uniq = Date.now();
const REGULAR_EMAIL = `profiletester${uniq}@example.com`;
const ADMIN_EMAIL = "admin@budgetwise.test";
const PASSWORD = "password123";

describe("Profile change request + admin approval flow", () => {
  it("lets a regular user request a name change that stays pending until an admin approves it", async () => {
    const user = userEvent.setup();

    window.history.pushState({}, "", "/register");
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText("Juan Dela Cruz"), "System Admin");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), ADMIN_EMAIL);
    await userEvent.type(screen.getByPlaceholderText("At least 6 characters"), PASSWORD);
    await userEvent.type(screen.getByPlaceholderText("Re-type password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/showing data for/i)).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: "SA" }));
    await user.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument());
    console.log("STEP 0 OK: admin account ready");

    await user.click(screen.getByText(/create one/i));
    await waitFor(() => expect(screen.getByPlaceholderText("Juan Dela Cruz")).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText("Juan Dela Cruz"), "Original Name");
    await userEvent.type(screen.getByPlaceholderText("you@example.com"), REGULAR_EMAIL);
    await userEvent.type(screen.getByPlaceholderText("At least 6 characters"), PASSWORD);
    await userEvent.type(screen.getByPlaceholderText("Re-type password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() => expect(screen.getByText(/showing data for/i)).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 1 OK: regular user registered");

    const avatarBtn = screen.getByRole("button", { name: "ON" });
    await user.click(avatarBtn);
    await user.click(screen.getByRole("button", { name: /my profile/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "My Profile" })).toBeInTheDocument());
    console.log("STEP 2 OK: My Profile page opened");

    const nameInput = screen.getByDisplayValue("Original Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Requested New Name");
    await user.click(screen.getByRole("button", { name: /save my changes/i }));

    await waitFor(() => expect(screen.getByText(/sent to the admin/i)).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 3 OK: change request submitted, told it needs admin approval");

    await waitFor(() => expect(screen.getByText(/change waiting for approval/i)).toBeInTheDocument());
    expect(screen.getByText("Requested New Name")).toBeInTheDocument();
    console.log("STEP 4 OK: pending request banner shows the requested name");

    await user.click(screen.getByRole("button", { name: "ON" }));
    await user.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText("you@example.com"), ADMIN_EMAIL);
    await user.type(screen.getByPlaceholderText("Password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(screen.getByText(/showing data for/i)).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 5 OK: logged in as admin");

    const requestsLink = await screen.findByRole("link", { name: /requests/i });
    await user.click(requestsLink);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Profile Change Requests" })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Requested New Name")).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 6 OK: admin sees the pending request with the requested name");

    await user.click(screen.getByRole("button", { name: /yes, allow it/i }));
    await waitFor(() => expect(screen.getByText(/all caught up/i)).toBeInTheDocument(), { timeout: 5000 });
    console.log("STEP 7 OK: admin approved, list is now empty");
  }, 40000);
});
