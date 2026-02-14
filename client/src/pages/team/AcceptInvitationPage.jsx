import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../context/AuthContext";

const AcceptInvitationPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvitation = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await API.get(`/team/invitation/${token}`);
        const data = res.data.data;
        setInvitation(data);
        setForm((current) => ({
          ...current,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        }));
      } catch (err) {
        setError(err.response?.data?.message || "Invitation could not be loaded");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadInvitation();
    }
  }, [token]);

  const acceptInvitation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await API.post("/team/accept-invitation", {
        token,
        ...form,
      });

      localStorage.setItem("token", res.data.data.token);
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h1>Invitation unavailable</h1>
          {error && <p className="error-text">{error}</p>}
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={acceptInvitation}>
        <h1>Join {invitation.workspace?.businessName}</h1>
        <p className="page-subtitle">Create your staff access for {invitation.email}</p>

        <div className="inline-fields">
          <label className="form-field">
            First name
            <input
              className="input"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>

          <label className="form-field">
            Last name
            <input
              className="input"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
        </div>

        <label className="form-field">
          Password
          <input
            className="input"
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Required for new users"
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "Accepting..." : "Accept Invitation"}
        </button>
      </form>
    </div>
  );
};

export default AcceptInvitationPage;
