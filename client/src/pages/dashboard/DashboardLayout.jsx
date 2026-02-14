import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Overview", to: "/dashboard" },
  { label: "Bookings", to: "/dashboard/bookings" },
  { label: "Inbox", to: "/dashboard/inbox" },
  { label: "Forms", to: "/dashboard/forms" },
  { label: "Inventory", to: "/dashboard/inventory" },
  { label: "Automation", to: "/dashboard/automation" },
  { label: "Calendar", to: "/dashboard/calendar" },
  { label: "Webhooks", to: "/dashboard/webhooks" },
  { label: "Ops Logs", to: "/dashboard/ops-logs" },
  { label: "Services", to: "/dashboard/services" },
  { label: "Availability", to: "/dashboard/availability" },
  { label: "Team", to: "/dashboard/team" },
  { label: "Settings", to: "/dashboard/settings" },
];

const iconStyle = { width: 16, height: 16, stroke: "currentColor", strokeWidth: 2, fill: "none" };

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="10" width="8" height="11" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

const BookingsIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <path d="M9 14l2 2 4-4" />
  </svg>
);

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M4 5h16v12H4z" />
    <path d="M4 14h4l2 3h4l2-3h4" />
  </svg>
);

const FormsIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M7 3h8l4 4v14H7z" />
    <path d="M15 3v4h4M9 12h6M9 16h6" />
  </svg>
);

const InventoryIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M3 7l9-4 9 4-9 4-9-4z" />
    <path d="M3 12l9 4 9-4M3 17l9 4 9-4" />
  </svg>
);

const AutomationIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="7" y="7" width="10" height="10" rx="2" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);

const WebhooksIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8.2 11l7.6-4M8.2 13l7.6 4" />
  </svg>
);

const LogsIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M7 3h8l4 4v14H7z" />
    <path d="M15 3v4h4M9 12h6M9 16h6" />
  </svg>
);

const ServicesIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="7" cy="12" r="2.5" />
    <circle cx="17" cy="7" r="2.5" />
    <circle cx="17" cy="17" r="2.5" />
    <path d="M9.2 11l5.6-3M9.2 13l5.6 3" />
  </svg>
);

const AvailabilityIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18M9 14l2 2 4-4" />
  </svg>
);

const TeamIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M3 20c.8-3 3-5 5-5s4.2 2 5 5M11 20c.8-3 3-5 5-5s4.2 2 5 5" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

const navIconByLabel = {
  Overview: <DashboardIcon />,
  Bookings: <BookingsIcon />,
  Inbox: <InboxIcon />,
  Forms: <FormsIcon />,
  Inventory: <InventoryIcon />,
  Automation: <AutomationIcon />,
  Calendar: <CalendarIcon />,
  Webhooks: <WebhooksIcon />,
  "Ops Logs": <LogsIcon />,
  Services: <ServicesIcon />,
  Availability: <AvailabilityIcon />,
  Team: <TeamIcon />,
  Settings: <SettingsIcon />,
};

const DashboardLayout = () => {
  const { logout, user, workspace, isOwner } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="dashboard-shell">
      {mobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeMobileMenu}
          aria-label="Close menu"
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-mobile-open" : ""}`}>
        <div>
          <div className="sidebar-head">
            <h1 className="brand">CareOps</h1>
            <button
              type="button"
              className="ghost-button sidebar-close"
              onClick={closeMobileMenu}
            >
              Close
            </button>
          </div>

          <p className="sidebar-subtitle">
            {workspace?.businessName || (isOwner ? "Workspace setup" : "Staff portal")}
          </p>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/dashboard"}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " sidebar-link-active" : ""}`
                }
              >
                <span className="sidebar-link-content">
                  {navIconByLabel[item.label]}
                  <span>{item.label}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <p className="muted-text">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="muted-text">{user?.email}</p>
          <button type="button" className="danger-button" onClick={logout}>
            Log Out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="mobile-topbar">
          <button
            type="button"
            className="primary-button"
            onClick={() => setMobileMenuOpen(true)}
          >
            Menu
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
