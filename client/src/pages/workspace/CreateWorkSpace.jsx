import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { useAuth } from "../../context/AuthContext";

const iconStyle = { width: 16, height: 16, stroke: "currentColor", strokeWidth: 2, fill: "none" };

const LabelWithIcon = ({ icon, text }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    {icon}
    <span>{text}</span>
  </span>
);

const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M11 21v-4h2v4" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .8 3a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.2-1.3a2 2 0 0 1 2.1-.5c1 .4 2 .7 3 .8A2 2 0 0 1 22 16.9z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" style={iconStyle}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6l4 2" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" style={{ ...iconStyle, marginRight: 6 }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.5 2.5L16 9" />
  </svg>
);

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const { hasWorkspace, refreshWorkspace } = useAuth();
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    phone: "",
    timezone: "America/New_York",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasWorkspace) navigate("/dashboard", { replace: true });
  }, [hasWorkspace, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await API.post("/workspaces", form);
      await refreshWorkspace();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Create workspace</h1>
        <p className="page-subtitle">Add business details to finish onboarding.</p>

        <label className="form-field">
          <LabelWithIcon icon={<BuildingIcon />} text="Business name" />
          <input
            className="input"
            required
            value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          />
        </label>

        <label className="form-field">
          <LabelWithIcon icon={<MapPinIcon />} text="Street address" />
          <input
            className="input"
            value={form.address.street}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, street: e.target.value },
              })
            }
          />
        </label>

        <div className="inline-fields">
          <label className="form-field">
            <LabelWithIcon icon={<MapPinIcon />} text="City" />
            <input
              className="input"
              value={form.address.city}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, city: e.target.value },
                })
              }
            />
          </label>

          <label className="form-field">
            <LabelWithIcon icon={<MapPinIcon />} text="State" />
            <input
              className="input"
              value={form.address.state}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, state: e.target.value },
                })
              }
            />
          </label>
        </div>

        <div className="inline-fields">
          <label className="form-field">
            <LabelWithIcon icon={<MapPinIcon />} text="ZIP code" />
            <input
              className="input"
              value={form.address.zipCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, zipCode: e.target.value },
                })
              }
            />
          </label>

          <label className="form-field">
            <LabelWithIcon icon={<GlobeIcon />} text="Country" />
            <input
              className="input"
              value={form.address.country}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, country: e.target.value },
                })
              }
            />
          </label>
        </div>

        <label className="form-field">
          <LabelWithIcon icon={<MailIcon />} text="Contact email" />
          <input
            className="input"
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          />
        </label>

        <label className="form-field">
          <LabelWithIcon icon={<PhoneIcon />} text="Phone" />
          <input
            className="input"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label className="form-field">
          <LabelWithIcon icon={<ClockIcon />} text="Timezone" />
          <input
            className="input"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" type="submit" disabled={loading}>
          <span style={{ display: "inline-flex", alignItems: "center" }}>
            {!loading && <CheckCircleIcon />}
            {loading ? "Creating..." : "Create Workspace"}
          </span>
        </button>
      </form>
    </div>
  );
};

export default CreateWorkspace;
