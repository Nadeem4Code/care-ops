import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../context/AuthContext";
import { appendOpsLog } from "../../lib/opsLogger";

const PublicFormSubmissionPage = () => {
  const { submissionId } = useParams();
  const [formMeta, setFormMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fields = useMemo(() => formMeta?.formTemplate?.fields || [], [formMeta]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await API.get(`/forms/public/${submissionId}`);
        setFormMeta(res.data.data);
        if (res.data.data?.status === "completed") {
          setSubmitted(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load form");
      }
    };

    load();
  }, [submissionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      await API.post(`/forms/public/${submissionId}`, { answers });

      appendOpsLog({
        level: "info",
        source: "public-form-ui",
        message: "Public form submitted successfully",
        meta: { submissionId },
      });

      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit form");
      appendOpsLog({
        level: "error",
        source: "public-form-ui",
        message: err.response?.data?.message || "Failed to submit form",
        meta: { submissionId },
      });
    } finally {
      setSaving(false);
    }
  };

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  };

  const renderField = (field) => {
    const value = answers[field.key] ?? "";
    const commonProps = {
      className: "input",
      value,
      onChange: (e) => updateAnswer(field.key, e.target.value),
      required: field.required,
    };

    if (field.type === "textarea") {
      return <textarea rows={4} {...commonProps} />;
    }

    if (field.type === "number") {
      return <input type="number" {...commonProps} />;
    }

    if (field.type === "date") {
      return <input type="date" {...commonProps} />;
    }

    if (field.type === "file") {
      return (
        <input
          type="url"
          placeholder="Paste file link"
          {...commonProps}
        />
      );
    }

    return <input type="text" {...commonProps} />;
  };

  return (
    <div className="public-shell">
      <div className="public-card">
        <h1>{formMeta?.formTemplate?.name || "Pre-Visit Form"}</h1>
        <p className="page-subtitle">Reference: {submissionId}</p>
        {error && <p className="error-text spaced-top">{error}</p>}

        {submitted ? (
          <div className="card spaced-top">
            <h3>Thank you</h3>
            <p>
              Your form response has been captured for this demo. Clinic staff can continue in the dashboard.
            </p>
          </div>
        ) : (
          <form className="form-grid spaced-top" onSubmit={handleSubmit}>
            {fields.length === 0 ? (
              <p>No fields configured for this form.</p>
            ) : (
              fields.map((field) => (
                <label key={field.key} className="form-field">
                  {field.label}
                  {renderField(field)}
                </label>
              ))
            )}

            <button className="primary-button" type="submit" disabled={saving || fields.length === 0}>
              {saving ? "Submitting..." : "Submit Form"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicFormSubmissionPage;
