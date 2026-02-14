import { useEffect, useMemo, useState } from "react";
import { appendOpsLog } from "../../lib/opsLogger";
import { useAuth } from "../../context/AuthContext";

const webhookEvents = [
  "contact.created",
  "booking.created",
  "booking.reminder_due",
  "form.overdue",
  "inventory.low_stock",
];

const WebhooksPage = () => {
  const { activeWorkspaceId } = useAuth();
  const storageKey = useMemo(
    () => `careops-webhooks-${activeWorkspaceId || "default"}`,
    [activeWorkspaceId],
  );

  const [hooks, setHooks] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    url: "",
    secret: "",
    events: ["booking.created"],
  });
  const [dispatchingId, setDispatchingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setHooks([]);
      return;
    }
    try {
      setHooks(JSON.parse(saved));
    } catch {
      setHooks([]);
    }
  }, [storageKey]);

  const saveHooks = (nextHooks) => {
    setHooks(nextHooks);
    localStorage.setItem(storageKey, JSON.stringify(nextHooks));
  };

  const createHook = (e) => {
    e.preventDefault();
    setError("");

    if (!form.url.trim()) {
      setError("Webhook URL is required");
      return;
    }

    const next = [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        isActive: true,
        ...form,
      },
      ...hooks,
    ];

    saveHooks(next);
    setForm({ url: "", secret: "", events: ["booking.created"] });

    appendOpsLog({
      level: "info",
      source: "webhook-ui",
      message: "Webhook endpoint configured",
      meta: { workspaceId: activeWorkspaceId },
    });
  };

  const toggleEvent = (eventName) => {
    if (form.events.includes(eventName)) {
      setForm({ ...form, events: form.events.filter((e) => e !== eventName) });
      return;
    }
    setForm({ ...form, events: [...form.events, eventName] });
  };

  const testDispatch = async (hook) => {
    setDispatchingId(hook.id);
    setError("");

    const payload = {
      event: hook.events[0] || "booking.created",
      workspaceId: activeWorkspaceId,
      timestamp: new Date().toISOString(),
      data: {
        id: "sample-123",
        status: "demo",
      },
    };

    try {
      const response = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(hook.secret ? { "x-careops-signature": hook.secret } : {}),
        },
        body: JSON.stringify(payload),
      });

      appendOpsLog({
        level: response.ok ? "info" : "error",
        source: "webhook-dispatch",
        message: response.ok
          ? `Webhook test successful (${response.status})`
          : `Webhook test failed (${response.status})`,
        meta: { url: hook.url, status: response.status },
      });

      if (!response.ok) {
        setError(`Webhook responded with ${response.status}`);
      }
    } catch (err) {
      setError(err.message || "Webhook dispatch failed");
      appendOpsLog({
        level: "error",
        source: "webhook-dispatch",
        message: err.message || "Webhook dispatch failed",
        meta: { url: hook.url },
      });
    } finally {
      setDispatchingId(null);
    }
  };

  const toggleHookStatus = (id) => {
    const next = hooks.map((hook) =>
      hook.id === id ? { ...hook, isActive: !hook.isActive } : hook,
    );
    saveHooks(next);
  };

  const removeHook = (id) => {
    saveHooks(hooks.filter((hook) => hook.id !== id));
  };

  return (
    <section>
      <h2 className="page-title">Webhooks</h2>
      <p className="page-subtitle">Configure outbound event webhooks and test deliveries.</p>
      {error && <p className="error-text">{error}</p>}

      <form className="card form-grid spaced-top" onSubmit={createHook}>
        <label className="form-field">
          Endpoint URL
          <input
            className="input"
            type="url"
            placeholder="https://example.com/webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
        </label>

        <label className="form-field">
          Signing secret (optional)
          <input
            className="input"
            value={form.secret}
            onChange={(e) => setForm({ ...form, secret: e.target.value })}
          />
        </label>

        <div className="permission-grid">
          {webhookEvents.map((eventName) => (
            <label key={eventName} className="checkbox-row">
              <input
                type="checkbox"
                checked={form.events.includes(eventName)}
                onChange={() => toggleEvent(eventName)}
              />
              {eventName}
            </label>
          ))}
        </div>

        <button className="primary-button" type="submit">
          Add Webhook
        </button>
      </form>

      <div className="card spaced-top">
        <h3>Configured endpoints</h3>
        {hooks.length === 0 ? (
          <p>No webhooks configured yet.</p>
        ) : (
          <div className="list-stack spaced-top">
            {hooks.map((hook) => (
              <article key={hook.id} className="split-card">
                <div>
                  <h4>{hook.url}</h4>
                  <p className="muted-text">Events: {hook.events.join(", ")}</p>
                  <p className="muted-text">Status: {hook.isActive ? "Active" : "Paused"}</p>
                </div>

                <div className="row-gap">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => toggleHookStatus(hook.id)}
                  >
                    {hook.isActive ? "Pause" : "Activate"}
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => testDispatch(hook)}
                    disabled={dispatchingId === hook.id}
                  >
                    {dispatchingId === hook.id ? "Sending..." : "Test"}
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => removeHook(hook.id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WebhooksPage;
