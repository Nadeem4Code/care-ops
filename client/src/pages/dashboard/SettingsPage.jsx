import { useEffect, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const SettingsPage = () => {
  const { workspace, isOwner, refreshWorkspace, activeWorkspaceId } = useAuth();
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    phone: "",
    timezone: "America/New_York",
  });
  const [emailProvider, setEmailProvider] = useState("sendgrid");
  const [smsProvider, setSmsProvider] = useState("twilio");
  const [credentialsJson, setCredentialsJson] = useState("{}");
  const [externalFormUrl, setExternalFormUrl] = useState("");
  const [integrations, setIntegrations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!workspace) return;
    setForm({
      businessName: workspace.businessName || "",
      contactEmail: workspace.contactEmail || "",
      phone: workspace.phone || "",
      timezone: workspace.timezone || "America/New_York",
    });
  }, [workspace]);

  const loadIntegrations = async () => {
    if (!activeWorkspaceId) return;

    try {
      const res = await API.get(`/integrations/workspace/${activeWorkspaceId}`);
      setIntegrations(res.data.data || []);
    } catch {
      setIntegrations([]);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, [activeWorkspaceId]);

  const runAction = async (action) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await action();
      await refreshWorkspace();
      await loadIntegrations();
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
    } finally {
      setSaving(false);
    }
  };

  const saveWorkspace = async (e) => {
    e.preventDefault();
    if (!isOwner || !workspace?._id) return;

    await runAction(async () => {
      await API.put(`/workspaces/${workspace._id}`, form);
      setMessage("Workspace updated");
    });
  };

  const parseCredentials = () => {
    try {
      return JSON.parse(credentialsJson || "{}");
    } catch {
      throw new Error("Credentials must be valid JSON");
    }
  };

  const setupEmail = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    await runAction(async () => {
      await API.post("/integrations/email", {
        workspaceId: activeWorkspaceId,
        provider: emailProvider,
        credentials: parseCredentials(),
      });
      setMessage("Email integration saved");
    });
  };

  const setupSms = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    await runAction(async () => {
      await API.post("/integrations/sms", {
        workspaceId: activeWorkspaceId,
        provider: smsProvider,
        credentials: parseCredentials(),
      });
      setMessage("SMS integration saved");
    });
  };

  const sendTestEmail = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    await runAction(async () => {
      await API.post("/integrations/email/test", { workspaceId: activeWorkspaceId });
      setMessage("Test email sent");
    });
  };

  const sendTestSms = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    await runAction(async () => {
      await API.post("/integrations/sms/test", {
        workspaceId: activeWorkspaceId,
        phone: form.phone,
      });
      setMessage("Test SMS sent");
    });
  };

  const configureContactForm = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    await runAction(async () => {
      await API.post("/contacts/configure", {
        workspaceId: activeWorkspaceId,
        externalFormUrl,
      });
      setMessage("Contact form configured");
    });
  };

  const copyPublicLink = async () => {
    if (!workspace?.slug) {
      setError("Workspace slug is not available yet");
      return;
    }

    const publicUrl = `${window.location.origin}/w/${workspace.slug}`;

    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage("Public booking link copied");
      setError("");
    } catch {
      setError("Failed to copy link. Please copy it manually.");
      setMessage("");
    }
  };

  return (
    <section>
      <h2 className="page-title">Settings</h2>
      <p className="page-subtitle">Workspace profile, integrations, and onboarding controls.</p>

      {error && <p className="error-text">{error}</p>}
      {message && <p className="success-text">{message}</p>}

      <form className="card form-grid spaced-top" onSubmit={saveWorkspace}>
        <h3>Workspace profile</h3>

        <label className="form-field">
          Business name
          <input
            className="input"
            value={form.businessName}
            disabled={!isOwner}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </label>

        <label className="form-field">
          Contact email
          <input
            className="input"
            type="email"
            value={form.contactEmail}
            disabled={!isOwner}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
        </label>

        <label className="form-field">
          Phone
          <input
            className="input"
            value={form.phone}
            disabled={!isOwner}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label className="form-field">
          Timezone
          <input
            className="input"
            value={form.timezone}
            disabled={!isOwner}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </label>

        {isOwner && (
          <div className="row-gap">
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save Workspace"}
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={copyPublicLink}
              disabled={!workspace?.slug}
            >
              Copy Public Link
            </button>
          </div>
        )}
      </form>

      {isOwner && (
        <div className="card form-grid spaced-top">
          <h3>Communication integrations</h3>

          <div className="inline-fields">
            <label className="form-field">
              Email provider
              <input className="input" value={emailProvider} onChange={(e) => setEmailProvider(e.target.value)} />
            </label>

            <label className="form-field">
              SMS provider
              <input className="input" value={smsProvider} onChange={(e) => setSmsProvider(e.target.value)} />
            </label>
          </div>

          <label className="form-field">
            Credentials (JSON)
            <textarea
              className="input"
              rows={5}
              value={credentialsJson}
              onChange={(e) => setCredentialsJson(e.target.value)}
            />
          </label>

          <div className="row-gap">
            <button type="button" className="primary-button" onClick={setupEmail} disabled={saving}>
              Save Email Integration
            </button>
            <button type="button" className="primary-button" onClick={setupSms} disabled={saving}>
              Save SMS Integration
            </button>
            <button type="button" className="ghost-button" onClick={sendTestEmail} disabled={saving}>
              Test Email
            </button>
            <button type="button" className="ghost-button" onClick={sendTestSms} disabled={saving}>
              Test SMS
            </button>
          </div>

          <p className="muted-text">Active integrations: {integrations.length}</p>
        </div>
      )}

      {isOwner && (
        <div className="card form-grid spaced-top">
          <h3>Contact form setup</h3>
          <p className="muted-text">Configure default public contact form and welcome workflow.</p>
          <label className="form-field">
            External form URL (optional)
            <input
              className="input"
              type="url"
              placeholder="https://forms.gle/..."
              value={externalFormUrl}
              onChange={(e) => setExternalFormUrl(e.target.value)}
            />
          </label>
          <button type="button" className="primary-button" onClick={configureContactForm} disabled={saving}>
            Configure Contact Form
          </button>
        </div>
      )}
    </section>
  );
};

export default SettingsPage;
