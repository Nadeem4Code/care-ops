import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CreateWorkspace from "./pages/workspace/CreateWorkSpace";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import BookingsPage from "./pages/dashboard/BookingsPage";
import ServicesPage from "./pages/dashboard/ServicesPage";
import AvailabilityPage from "./pages/dashboard/AvailabilityPage";
import TeamPage from "./pages/dashboard/TeamPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import AcceptInvitationPage from "./pages/team/AcceptInvitationPage";
import InboxPage from "./pages/dashboard/InboxPage";
import FormsPage from "./pages/dashboard/FormsPage";
import InventoryPage from "./pages/dashboard/InventoryPage";
import CalendarIntegrationPage from "./pages/dashboard/CalendarIntegrationPage";
import WebhooksPage from "./pages/dashboard/WebhooksPage";
import AutomationPage from "./pages/dashboard/AutomationPage";
import OpsLogsPage from "./pages/dashboard/OpsLogsPage";
import PublicWorkspacePage from "./pages/public/PublicWorkspacePage";
import PublicFormSubmissionPage from "./pages/public/PublicFormSubmissionPage";

const FullPageLoader = () => (
  <div className="full-page-center">
    <div className="app-loader" role="status" aria-label="Loading">
      <div className="app-loader-ring" />
      <div className="app-loader-core" />
    </div>
    <p className="app-loader-text">Loading workspace...</p>
  </div>
);

const PublicRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return <FullPageLoader />;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

const OwnerWorkspaceRoute = ({ children }) => {
  const { loading, isAuthenticated, isOwner, hasWorkspace } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/dashboard" replace />;
  if (hasWorkspace) return <Navigate to="/dashboard" replace />;

  return children;
};

const DashboardRoute = ({ children }) => {
  const { loading, isAuthenticated, isOwner, hasWorkspace } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOwner && !hasWorkspace) return <Navigate to="/create-workspace" replace />;

  return children;
};

const DefaultRedirect = () => {
  const { loading, isAuthenticated, isOwner, hasWorkspace } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isOwner && !hasWorkspace) return <Navigate to="/create-workspace" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
        <Route path="/w/:slug" element={<PublicWorkspacePage />} />
        <Route path="/forms/:submissionId" element={<PublicFormSubmissionPage />} />

        <Route
          path="/create-workspace"
          element={
            <OwnerWorkspaceRoute>
              <CreateWorkspace />
            </OwnerWorkspaceRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <DashboardRoute>
              <DashboardLayout />
            </DashboardRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="forms" element={<FormsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="calendar" element={<CalendarIntegrationPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="ops-logs" element={<OpsLogsPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </Router>
  );
}

export default App;
