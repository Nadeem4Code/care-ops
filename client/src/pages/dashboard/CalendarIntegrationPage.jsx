import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";
import { appendOpsLog } from "../../lib/opsLogger";

const buildIcs = (workspaceName, bookings) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CareOps//Calendar Export//EN",
  ];

  bookings.forEach((booking) => {
    const date = new Date(booking.bookingDate);
    const [startHour, startMinute] = booking.startTime.split(":").map(Number);
    const [endHour, endMinute] = booking.endTime.split(":").map(Number);

    const start = new Date(date);
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date(date);
    end.setHours(endHour, endMinute, 0, 0);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${booking._id}@careops`);
    lines.push(`DTSTAMP:${fmt(new Date())}`);
    lines.push(`DTSTART:${fmt(start)}`);
    lines.push(`DTEND:${fmt(end)}`);
    lines.push(`SUMMARY:${booking.serviceType?.name || "Booking"} - ${workspaceName}`);
    lines.push(`DESCRIPTION:Contact ${booking.contact?.name || booking.contact?.email || "N/A"}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
};

const CalendarIntegrationPage = () => {
  const { activeWorkspaceId, workspace } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [calendarId, setCalendarId] = useState("primary");
  const [config, setConfig] = useState({
    provider: "google-calendar",
    autoSyncEnabled: true,
    reminderMinutes: 60,
  });

  const storageKey = useMemo(
    () => `careops-calendar-config-${activeWorkspaceId || "default"}`,
    [activeWorkspaceId],
  );

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setConfig(JSON.parse(stored));
      } catch {
        setConfig((c) => c);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    const loadBookings = async () => {
      if (!activeWorkspaceId) return;
      try {
        const [bookingsRes, statusRes] = await Promise.all([
          API.get(`/bookings/workspace/${activeWorkspaceId}`),
          API.get(`/google/status/${activeWorkspaceId}`),
        ]);

        setBookings(bookingsRes.data.data || []);
        setConnected(statusRes.data.data?.connected || false);
        setCalendarId(statusRes.data.data?.calendarId || "primary");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load bookings");
      }
    };

    loadBookings();
  }, [activeWorkspaceId]);

  const saveConfig = () => {
    localStorage.setItem(storageKey, JSON.stringify(config));
    appendOpsLog({
      level: "info",
      source: "calendar-ui",
      message: "Calendar integration configuration updated",
      meta: { workspaceId: activeWorkspaceId, provider: config.provider },
    });
  };

  const connectGoogle = async () => {
    if (!activeWorkspaceId) return;
    setError("");

    try {
      const res = await API.get(`/google/auth`, {
        params: { workspaceId: activeWorkspaceId },
      });
      const url = res.data.data?.url;
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start Google auth");
    }
  };

  const downloadIcs = () => {
    const ics = buildIcs(workspace?.businessName || "CareOps", bookings);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workspace?.slug || "workspace"}-bookings.ics`;
    a.click();
    URL.revokeObjectURL(url);

    appendOpsLog({
      level: "info",
      source: "calendar-ui",
      message: "ICS calendar export downloaded",
      meta: { workspaceId: activeWorkspaceId, bookingCount: bookings.length },
    });
  };

  return (
    <section>
      <h2 className="page-title">Calendar Integration</h2>
      <p className="page-subtitle">
        Connect Google Calendar to sync new bookings and export upcoming bookings as ICS.
      </p>
      {error && <p className="error-text">{error}</p>}

      <div className="card form-grid spaced-top">
        <label className="form-field">
          Provider
          <input
            className="input"
            value={config.provider}
            onChange={(e) => setConfig({ ...config, provider: e.target.value })}
          />
        </label>

        <label className="form-field">
          Calendar ID / URL
          <input
            className="input"
            value={calendarId}
            disabled
            placeholder="primary"
          />
        </label>

        <div className="inline-fields">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={config.autoSyncEnabled}
              onChange={(e) => setConfig({ ...config, autoSyncEnabled: e.target.checked })}
            />
            Auto sync enabled
          </label>

          <label className="form-field">
            Reminder lead (minutes)
            <input
              className="input"
              type="number"
              min={5}
              value={config.reminderMinutes}
              onChange={(e) => setConfig({ ...config, reminderMinutes: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="row-gap">
          <button type="button" className="primary-button" onClick={saveConfig}>
            Save Config
          </button>
          <button type="button" className="ghost-button" onClick={connectGoogle}>
            {connected ? "Reconnect Google" : "Connect Google"}
          </button>
          <button type="button" className="ghost-button" onClick={downloadIcs}>
            Download ICS
          </button>
        </div>
        <p className="muted-text">
          Status: {connected ? "Connected (syncing new bookings to primary calendar)" : "Not connected"}
        </p>
      </div>

      <div className="card spaced-top">
        <h3>Upcoming bookings preview</h3>
        {bookings.length === 0 ? (
          <p>No bookings available.</p>
        ) : (
          <div className="list-stack spaced-top">
            {bookings.slice(0, 20).map((booking) => (
              <article key={booking._id} className="split-card">
                <div>
                  <h4>{booking.serviceType?.name || "Service"}</h4>
                  <p className="muted-text">
                    {new Date(booking.bookingDate).toLocaleDateString()} {booking.startTime}-{booking.endTime}
                  </p>
                  <p className="muted-text">{booking.contact?.name || booking.contact?.email || "-"}</p>
                </div>
                <strong>{booking.status}</strong>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CalendarIntegrationPage;
