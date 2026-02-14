import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";
import { appendOpsLog } from "../../lib/opsLogger";

const AutomationPage = () => {
  const { activeWorkspaceId } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [forms, setForms] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!activeWorkspaceId) return;

      try {
        const [bookingsRes, formsRes] = await Promise.all([
          API.get(`/bookings/workspace/${activeWorkspaceId}`),
          API.get(`/forms/submissions/workspace/${activeWorkspaceId}`),
        ]);

        setBookings(bookingsRes.data.data || []);
        setForms(formsRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load automation data");
      }
    };

    load();
  }, [activeWorkspaceId]);

  const queue = useMemo(() => {
    const now = new Date();

    const bookingReminders = bookings
      .filter((booking) => booking.status === "confirmed")
      .map((booking) => {
        const bookingDate = new Date(booking.bookingDate);
        const [h, m] = booking.startTime.split(":").map(Number);
        bookingDate.setHours(h, m, 0, 0);

        const reminderAt = new Date(bookingDate.getTime() - 60 * 60 * 1000);
        const due = reminderAt <= now;

        return {
          id: `booking-${booking._id}`,
          type: "booking.reminder",
          target: booking.contact?.email || booking.contact?.name || "Contact",
          description: `Booking reminder for ${booking.serviceType?.name || "service"}`,
          scheduledAt: reminderAt,
          due,
        };
      });

    const formReminders = forms
      .filter((form) => ["pending", "overdue"].includes(form.status))
      .map((form) => {
        const dueAt = new Date(form.dueAt);
        return {
          id: `form-${form._id}`,
          type: "form.reminder",
          target: form.contact?.email || form.contact?.name || "Contact",
          description: `Pending form reminder: ${form.formTemplate?.name || "form"}`,
          scheduledAt: dueAt,
          due: dueAt <= now,
        };
      });

    return [...bookingReminders, ...formReminders].sort(
      (a, b) => a.scheduledAt - b.scheduledAt,
    );
  }, [bookings, forms]);

  const simulateDispatch = (item) => {
    appendOpsLog({
      level: "info",
      source: "automation-monitor",
      message: `Manual simulation sent for ${item.type}`,
      meta: {
        queueId: item.id,
        target: item.target,
        scheduledAt: item.scheduledAt.toISOString(),
      },
    });
  };

  return (
    <section>
      <h2 className="page-title">Automation Scheduler</h2>
      <p className="page-subtitle">
        Monitor reminder queue for bookings and forms. This frontend monitor helps demo timed automations.
      </p>
      {error && <p className="error-text">{error}</p>}

      <div className="card spaced-top">
        <h3>Queue snapshot</h3>
        {queue.length === 0 ? (
          <p>No pending automation events.</p>
        ) : (
          <div className="list-stack spaced-top">
            {queue.map((item) => (
              <article key={item.id} className="split-card">
                <div>
                  <h4>{item.description}</h4>
                  <p className="muted-text">Type: {item.type}</p>
                  <p className="muted-text">Target: {item.target}</p>
                  <p className="muted-text">Scheduled: {item.scheduledAt.toLocaleString()}</p>
                </div>
                <div className="row-gap">
                  <strong>{item.due ? "Due" : "Scheduled"}</strong>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => simulateDispatch(item)}
                  >
                    Simulate Dispatch
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

export default AutomationPage;
