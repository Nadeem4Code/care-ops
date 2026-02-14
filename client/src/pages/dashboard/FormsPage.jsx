import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const emptyForm = {
  name: "",
  description: "",
  dueInHours: 24,
  fieldsText: "name:Name:true:text\nemail:Email:true:text\nnotes:Notes:false:textarea",
};

const parseFields = (fieldsText) =>
  fieldsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, label, requiredRaw, typeRaw] = line.split(":");
      return {
        key,
        label: label || key,
        required: requiredRaw === "true",
        type: typeRaw || "text",
      };
    });

const FormsPage = () => {
  const { activeWorkspaceId, isOwner } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);
  const [applyToAllServices, setApplyToAllServices] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!activeWorkspaceId) return;

    try {
      const [templatesRes, submissionsRes, servicesRes] = await Promise.all([
        API.get(`/forms/templates/workspace/${activeWorkspaceId}`),
        API.get(`/forms/submissions/workspace/${activeWorkspaceId}`),
        API.get(`/service-types/workspace/${activeWorkspaceId}`),
      ]);

      setTemplates(templatesRes.data.data || []);
      setSubmissions(submissionsRes.data.data || []);
      setServiceTypes(servicesRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load forms");
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspaceId]);

  const selectedServiceIds = useMemo(() => {
    if (applyToAllServices) {
      return serviceTypes.map((service) => service._id);
    }
    return selectedServiceTypes;
  }, [applyToAllServices, selectedServiceTypes, serviceTypes]);

  const toggleService = (serviceId) => {
    setSelectedServiceTypes((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
      await API.post("/forms/templates", {
        workspaceId: activeWorkspaceId,
        name: form.name,
        description: form.description,
        dueInHours: Number(form.dueInHours),
        fields: parseFields(form.fieldsText),
        serviceTypes: selectedServiceIds,
      });
      setForm(emptyForm);
      setSelectedServiceTypes([]);
      setApplyToAllServices(true);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create form template");
    }
  };

  const completeSubmission = async (submissionId) => {
    try {
      await API.put(`/forms/submissions/${submissionId}/complete`, {
        answers: { completedBy: "staff", completedAt: new Date().toISOString() },
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark form complete");
    }
  };

  return (
    <section>
      <h2 className="page-title">Forms</h2>
      <p className="page-subtitle">Post-booking intake and agreement tracking.</p>
      {error && <p className="error-text">{error}</p>}

      {isOwner && (
        <form className="card form-grid spaced-top" onSubmit={createTemplate}>
          <h3>Create post-booking form template</h3>

          <label className="form-field">
            Name
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label className="form-field">
            Description
            <input
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className="form-field">
            Due in hours
            <input
              className="input"
              type="number"
              min={1}
              value={form.dueInHours}
              onChange={(e) => setForm({ ...form, dueInHours: e.target.value })}
            />
          </label>

          <label className="form-field">
            Fields (key:Label:required:type)
            <textarea
              className="input"
              rows={4}
              value={form.fieldsText}
              onChange={(e) => setForm({ ...form, fieldsText: e.target.value })}
            />
          </label>

          <div className="card">
            <p className="muted-text">Link this form to booking types</p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={applyToAllServices}
                onChange={(e) => setApplyToAllServices(e.target.checked)}
              />
              Apply to all services
            </label>
            {!applyToAllServices && (
              <div className="permission-grid">
                {serviceTypes.map((service) => (
                  <label key={service._id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedServiceTypes.includes(service._id)}
                      onChange={() => toggleService(service._id)}
                    />
                    {service.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button className="primary-button" type="submit">Create Form Template</button>
        </form>
      )}

      <div className="card spaced-top">
        <h3>Templates</h3>
        {templates.length === 0 ? (
          <p>No form templates yet.</p>
        ) : (
          <div className="list-stack spaced-top">
            {templates.map((template) => (
              <article key={template._id} className="split-card">
                <div>
                  <h4>{template.name}</h4>
                  <p className="muted-text">{template.description || "No description"}</p>
                  <p className="muted-text">Fields: {template.fields?.length || 0}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card spaced-top">
        <h3>Form submissions</h3>
        {submissions.length === 0 ? (
          <p>No submissions yet.</p>
        ) : (
          <div className="list-stack spaced-top">
            {submissions.map((submission) => (
              <article key={submission._id} className="split-card">
                <div>
                  <h4>{submission.formTemplate?.name || "Form"}</h4>
                  <p className="muted-text">Contact: {submission.contact?.name || "-"}</p>
                  <p className="muted-text">Status: {submission.status}</p>
                  <p className="muted-text">Due: {new Date(submission.dueAt).toLocaleString()}</p>
                </div>
                {submission.status !== "completed" && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => completeSubmission(submission._id)}
                  >
                    Mark Complete
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FormsPage;
