import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API, { useAuth } from "../../context/AuthContext";

const steps = [
  { key: "workspaceCreated", label: "Workspace created" },
  { key: "emailConfigured", label: "Communication integration" },
  { key: "contactFormCreated", label: "Contact form configured" },
  { key: "bookingSetup", label: "Booking setup" },
  { key: "formsSetup", label: "Forms setup" },
  { key: "inventorySetup", label: "Inventory setup" },
];

const DashboardHome = () => {
  const { user, workspace, isOwner, activeWorkspaceId, refreshWorkspace } = useAuth();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  const completedCount = useMemo(() => {
    if (!workspace?.onboardingSteps) return 0;
    return steps.filter((s) => workspace.onboardingSteps[s.key]).length;
  }, [workspace]);

  const loadOverview = async () => {
    if (!activeWorkspaceId) return;

    try {
      const res = await API.get(`/dashboard/overview/${activeWorkspaceId}`);
      setOverview(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard overview");
    }
  };

  useEffect(() => {
    loadOverview();
  }, [activeWorkspaceId]);

  const activateWorkspace = async () => {
    if (!workspace?._id) return;

    try {
      await API.post(`/workspaces/${workspace._id}/activate`);
      await refreshWorkspace();
      await loadOverview();
    } catch (err) {
      setError(err.response?.data?.message || "Workspace activation failed");
    }
  };

  return (
    <section>
      <h2 className="page-title">Dashboard</h2>
      <p className="page-subtitle">
        Welcome back, {user?.firstName || "there"}. Monitor your business operations in one place.
      </p>
      {error && <p className="error-text">{error}</p>}

      <div className="grid-cards">
        <article className="card">
          <p className="card-label">Today's bookings</p>
          <h3>{overview?.bookingOverview?.todaysBookings ?? "-"}</h3>
        </article>

        <article className="card">
          <p className="card-label">Unanswered messages</p>
          <h3>{overview?.leadsAndConversations?.unansweredMessages ?? "-"}</h3>
        </article>

        <article className="card">
          <p className="card-label">Overdue forms</p>
          <h3>{overview?.formsStatus?.overdueForms ?? "-"}</h3>
        </article>

        <article className="card">
          <p className="card-label">Low stock items</p>
          <h3>{overview?.inventory?.lowStockItems?.length ?? "-"}</h3>
        </article>
      </div>

      {overview?.alerts?.length > 0 && (
        <article className="card spaced-top">
          <h3>Key alerts</h3>
          <div className="list-stack spaced-top">
            {overview.alerts.map((alert) => (
              <div key={`${alert.type}-${alert.label}`} className="row-between">
                <span>{alert.label}</span>
                <Link to={alert.link}>Open</Link>
              </div>
            ))}
          </div>
        </article>
      )}

      {isOwner && workspace && (
        <article className="card spaced-top">
          <h3>Onboarding status</h3>
          <p className="muted-text">
            {completedCount} / {steps.length} setup steps complete
          </p>
          <div className="list-stack spaced-top">
            {steps.map((step) => (
              <div key={step.key} className="row-between">
                <span>{step.label}</span>
                <strong>{workspace?.onboardingSteps?.[step.key] ? "Done" : "Pending"}</strong>
              </div>
            ))}
          </div>

          {!workspace.isActive && (
            <button className="primary-button spaced-top" type="button" onClick={activateWorkspace}>
              Activate Workspace
            </button>
          )}
        </article>
      )}
    </section>
  );
};

export default DashboardHome;
