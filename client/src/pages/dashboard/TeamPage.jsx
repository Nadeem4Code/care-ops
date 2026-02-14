import { useEffect, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const permissionKeys = [
  "viewInbox",
  "replyToMessages",
  "manageBookings",
  "viewForms",
  "manageForms",
  "viewInventory",
  "manageInventory",
  "viewAnalytics",
  "manageSettings",
];

const defaultPermissions = {
  viewInbox: true,
  replyToMessages: true,
  manageBookings: true,
  viewForms: true,
  manageForms: false,
  viewInventory: false,
  manageInventory: false,
  viewAnalytics: false,
  manageSettings: false,
};

const TeamPage = () => {
  const { activeWorkspaceId, isOwner } = useAuth();
  const [members, setMembers] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    permissions: defaultPermissions,
  });

  const loadTeam = async () => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    setError("");

    try {
      const res = await API.get(`/team/workspace/${activeWorkspaceId}`);
      setMembers(res.data.data.members || []);
      setPendingInvitations(res.data.data.pendingInvitations || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [activeWorkspaceId]);

  const submitInvite = async (e) => {
    e.preventDefault();
    if (!isOwner || !activeWorkspaceId) return;

    setSaving(true);
    setError("");

    try {
      await API.post("/team/invite", {
        workspaceId: activeWorkspaceId,
        ...inviteForm,
      });
      setInviteForm({
        firstName: "",
        lastName: "",
        email: "",
        permissions: defaultPermissions,
      });
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId) => {
    if (!isOwner) return;

    try {
      await API.delete(`/team/${memberId}`, {
        data: { workspaceId: activeWorkspaceId },
      });
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove member");
    }
  };

  const cancelInvitation = async (invitationId) => {
    if (!isOwner) return;

    try {
      await API.delete(`/team/invitation/${invitationId}`);
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel invitation");
    }
  };

  const resendInvitation = async (invitationId) => {
    if (!isOwner) return;

    try {
      await API.post(`/team/invitation/${invitationId}/resend`);
      await loadTeam();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend invitation");
    }
  };

  return (
    <section>
      <h2 className="page-title">Team</h2>
      <p className="page-subtitle">Invite and manage staff access for this workspace.</p>
      {error && <p className="error-text">{error}</p>}

      {isOwner && (
        <form className="card form-grid spaced-top" onSubmit={submitInvite}>
          <h3>Invite team member</h3>

          <div className="inline-fields">
            <label className="form-field">
              First name
              <input
                className="input"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
              />
            </label>

            <label className="form-field">
              Last name
              <input
                className="input"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
              />
            </label>
          </div>

          <label className="form-field">
            Email
            <input
              className="input"
              type="email"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />
          </label>

          <div className="list-stack">
            <p className="muted-text">Permissions</p>
            <div className="permission-grid">
              {permissionKeys.map((key) => (
                <label key={key} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={inviteForm.permissions[key]}
                    onChange={(e) =>
                      setInviteForm({
                        ...inviteForm,
                        permissions: {
                          ...inviteForm.permissions,
                          [key]: e.target.checked,
                        },
                      })
                    }
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Sending..." : "Send Invitation"}
          </button>
        </form>
      )}

      <div className="card spaced-top">
        <h3>Members</h3>
        {loading ? (
          <p>Loading team...</p>
        ) : members.length === 0 ? (
          <p>No team members found.</p>
        ) : (
          <div className="list-stack spaced-top">
            {members.map((member) => (
              <article key={member.id} className="split-card">
                <div>
                  <h4>
                    {member.firstName} {member.lastName}
                  </h4>
                  <p className="muted-text">{member.email}</p>
                  <p className="muted-text">Role: {member.role}</p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeMember(member.id)}
                  >
                    Remove
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card spaced-top">
        <h3>Pending invitations</h3>
        {loading ? (
          <p>Loading invitations...</p>
        ) : pendingInvitations.length === 0 ? (
          <p>No pending invitations.</p>
        ) : (
          <div className="list-stack spaced-top">
            {pendingInvitations.map((invite) => (
              <article key={invite._id} className="split-card">
                <div>
                  <h4>{invite.email}</h4>
                  <p className="muted-text">
                    Expires: {new Date(invite.expiresAt).toLocaleString()}
                  </p>
                </div>
                {isOwner && (
                  <div className="row-gap">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => resendInvitation(invite._id)}
                    >
                      Resend
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => cancelInvitation(invite._id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TeamPage;
