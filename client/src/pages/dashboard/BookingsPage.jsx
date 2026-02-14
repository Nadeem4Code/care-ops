import { useEffect, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const statusOptions = ["confirmed", "completed", "no-show", "cancelled"];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
};

const BookingsPage = () => {
  const { activeWorkspaceId } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBookings = async () => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    setError("");

    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await API.get(`/bookings/workspace/${activeWorkspaceId}`, { params });
      setBookings(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [activeWorkspaceId, statusFilter]);

  const updateStatus = async (bookingId, status) => {
    try {
      await API.put(`/bookings/${bookingId}/status`, { workspaceId: activeWorkspaceId, status });
      setBookings((current) =>
        current.map((booking) =>
          booking._id === bookingId ? { ...booking, status } : booking,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update booking status");
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await API.delete(`/bookings/${bookingId}`, {
        data: { workspaceId: activeWorkspaceId },
      });
      setBookings((current) =>
        current.map((booking) =>
          booking._id === bookingId ? { ...booking, status: "cancelled" } : booking,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  return (
    <section>
      <div className="row-between">
        <div>
          <h2 className="page-title">Bookings</h2>
          <p className="page-subtitle">Manage booking states and review upcoming appointments.</p>
        </div>

        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card spaced-top">
        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p>No bookings found for this workspace.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Contact</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{formatDate(booking.bookingDate)}</td>
                    <td>
                      {booking.startTime} - {booking.endTime}
                    </td>
                    <td>{booking.contact?.name || booking.contact?.email || "-"}</td>
                    <td>{booking.serviceType?.name || "-"}</td>
                    <td>{booking.status}</td>
                    <td className="actions-cell">
                      <select
                        className="input compact-input"
                        value={booking.status}
                        onChange={(e) => updateStatus(booking._id, e.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => cancelBooking(booking._id)}
                        disabled={booking.status === "cancelled"}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default BookingsPage;
