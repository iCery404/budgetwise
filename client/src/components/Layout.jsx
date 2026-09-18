import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";
import Icon from "./Icon";
import Logo from "./Logo";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/transactions", label: "Transactions & Budget", icon: "transactions" },
  { to: "/categories", label: "Categories", icon: "categories" },
  { to: "/reports", label: "Reports", icon: "reports" },
  { to: "/goals", label: "Goals", icon: "goal" },
  { to: "/debts", label: "Debts", icon: "debt" },
];

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggleDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/profile-requests").then(({ data }) => setPendingCount(data.length)).catch(() => {});
    }
  }, [user, location.pathname]);

  const items = user?.role === "admin"
    ? [
        ...NAV_ITEMS,
        { to: "/admin/users", label: "User Management", icon: "users" },
        { to: "/admin/profile-requests", label: "Requests", icon: "categories", badge: pendingCount },
        { to: "/admin/analytics", label: "Analytics", icon: "analytics" },
      ]
    : NAV_ITEMS;

  useLayoutEffect(() => {
    const activeEl = navRef.current?.querySelector('a[aria-current="page"]');
    if (activeEl) {
      setIndicator({ left: activeEl.offsetLeft, width: activeEl.offsetWidth, opacity: 1 });
    } else {
      setIndicator((s) => ({ ...s, opacity: 0 }));
    }
  }, [location.pathname, user]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const linkClass = ({ isActive }) =>
    `relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ${
      isActive ? "text-white" : "text-text-body hover:text-sage-deep"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-7 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Logo size={30} />
            <span className="font-semibold text-[15px] hidden sm:inline">
              <span className="text-sage">Budget</span>Wise
            </span>
          </div>

          <nav ref={navRef} className="hidden md:flex relative items-center gap-1 bg-muted rounded-full p-1 overflow-x-auto max-w-[46vw] no-scrollbar">
            <div
              className="absolute top-1 bottom-1 bg-sage-deep rounded-full shadow-sm transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
              style={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
            />
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <Icon name={item.icon} size={15} />
                <span>{item.label}</span>
                {!!item.badge && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose text-white text-[10px] font-bold">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-muted hover:text-sage-deep"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Icon name={dark ? "sun" : "moon"} size={16} />
            </button>
            <button
              className="md:hidden w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-muted"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="w-9 h-9 rounded-full bg-sage text-white text-[12px] font-semibold flex items-center justify-center hover:brightness-105"
              >
                {initials(user?.name)}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-11 w-52 bg-card border border-border rounded-xl shadow-lg p-3 z-50 bw-modal-card">
                    <div className="text-[13px] font-medium text-text px-1">{user?.name}</div>
                    <div className="text-[11px] text-text-muted px-1 mb-2">
                      {user?.role === "admin" ? "Admin" : "User"}
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/profile"); }}
                      className="w-full text-left text-[13px] text-text-body px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-2"
                    >
                      <Icon name="edit" size={14} /> My Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-[13px] text-rose px-2 py-1.5 rounded-lg hover:bg-rose-soft"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-border px-4 py-2 flex flex-col gap-1 bg-card">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium ${
                    isActive ? "bg-sage-deep text-white" : "text-text-body"
                  }`
                }
              >
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <NavLink
              to="/profile"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium ${
                  isActive ? "bg-sage-deep text-white" : "text-text-body"
                }`
              }
            >
              <Icon name="edit" size={16} />
              <span>My Profile</span>
            </NavLink>
          </nav>
        )}
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-7">
        <div key={location.pathname} className="bw-page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
