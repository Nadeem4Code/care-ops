import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../context/AuthContext";

const PublicWorkspacePage = () => {
  const { slug } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [activeTab, setActiveTab] = useState("booking");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    phone: "",
    startTime: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const wsRes = await API.get(`/workspaces/slug/${slug}`);
        const ws = wsRes.data.data;
        setWorkspace(ws);

        const svcRes = await API.get(`/service-types/workspace/${ws._id}`);
        const svcData = svcRes.data.data || [];
        setServices(svcData);
        if (svcData[0]) {
          setSelectedServiceId(svcData[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load workspace");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  useEffect(() => {
    const loadSlots = async () => {
      if (!selectedServiceId || !date) {
        setSlots([]);
        return;
      }

      try {
        const res = await API.get("/bookings/available-slots", {
          params: {
            workspaceSlug: slug,
            serviceTypeId: selectedServiceId,
            date,
          },
        });
        setSlots(res.data.data?.slots || []);
      } catch {
        setSlots([]);
      }
    };

    loadSlots();
  }, [selectedServiceId, date, slug]);

  const selectedService = useMemo(
    () => services.find((service) => service._id === selectedServiceId),
    [services, selectedServiceId],
  );

  const submitContact = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await API.post("/contacts/public", {
        workspaceSlug: slug,
        ...contactForm,
      });
      setMessage("Message sent. Team will contact you soon.");
      setContactForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit contact form");
    }
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await API.post("/bookings/public", {
        workspaceSlug: slug,
        serviceTypeId: selectedServiceId,
        bookingDate: date,
        startTime: bookingForm.startTime,
        contactInfo: {
          name: bookingForm.name,
          email: bookingForm.email,
          phone: bookingForm.phone,
        },
      });
      setMessage("Booking confirmed. Check your email/SMS for details.");
      setBookingForm({ name: "", email: "", phone: "", startTime: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    }
  };

  if (loading) {
    return (
      <div className="public-shell">
        <div className="public-card">
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="public-shell">
        <div className="public-card">
          <h1>Workspace unavailable</h1>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <div className="public-card">
        <h1>{workspace.businessName}</h1>
        <p className="page-subtitle">
          {workspace.address?.street || ""} {workspace.address?.city || ""} {workspace.address?.state || ""} {workspace.address?.zipCode || ""}
        </p>
        {workspace.address?.country && (
          <p className="muted-text">{workspace.address.country}</p>
        )}

        <div className="row-gap spaced-top">
          <button
            type="button"
            className={activeTab === "booking" ? "primary-button" : "ghost-button"}
            onClick={() => setActiveTab("booking")}
          >
            Book Appointment
          </button>
          <button
            type="button"
            className={activeTab === "contact" ? "primary-button" : "ghost-button"}
            onClick={() => setActiveTab("contact")}
          >
            Contact Us
          </button>
        </div>

        {error && <p className="error-text spaced-top">{error}</p>}
        {message && <p className="success-text spaced-top">{message}</p>}

        {activeTab === "contact" ? (
          <div className="form-grid spaced-top">
            {workspace.contactFormExternalUrl && (
              <div className="card">
                <p className="muted-text">Prefer using the business' external contact form?</p>
                <a
                  className="primary-button"
                  href={workspace.contactFormExternalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Google Form
                </a>
              </div>
            )}

            <form className="form-grid" onSubmit={submitContact}>
              <label className="form-field">
                Name
                <input
                  className="input"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </label>

              <label className="form-field">
                Email
                <input
                  className="input"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </label>

              <label className="form-field">
                Phone
                <input
                  className="input"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </label>

              <label className="form-field">
                Message
                <textarea
                  className="input"
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                />
              </label>

              <button className="primary-button" type="submit">
                Submit
              </button>
            </form>
          </div>
        ) : (
          <form className="form-grid spaced-top" onSubmit={submitBooking}>
            <label className="form-field">
              Service
              <select
                className="input"
                value={selectedServiceId}
                onChange={(e) => {
                  setSelectedServiceId(e.target.value);
                  setBookingForm({ ...bookingForm, startTime: "" });
                }}
                required
              >
                {services.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name} ({service.durationMinutes} min)
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              Date
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setBookingForm({ ...bookingForm, startTime: "" });
                }}
                required
              />
            </label>

            <label className="form-field">
              Time slot
              <select
                className="input"
                value={bookingForm.startTime}
                onChange={(e) => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                required
              >
                <option value="">Select a time</option>
                {slots.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {slot.startTime} - {slot.endTime}
                  </option>
                ))}
              </select>
            </label>

            <div className="inline-fields">
              <label className="form-field">
                Name
                <input
                  className="input"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  required
                />
              </label>

              <label className="form-field">
                Email
                <input
                  className="input"
                  type="email"
                  value={bookingForm.email}
                  onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                  required
                />
              </label>
            </div>

            <label className="form-field">
              Phone
              <input
                className="input"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
              />
            </label>

            {selectedService && (
              <p className="muted-text">
                Duration: {selectedService.durationMinutes} min | Price: ${selectedService.price}
              </p>
            )}
            {(workspace.address?.street || workspace.address?.city) && (
              <p className="muted-text">
                Location: {workspace.address?.street || ""} {workspace.address?.city || ""} {workspace.address?.state || ""} {workspace.address?.zipCode || ""}
              </p>
            )}

            <button className="primary-button" type="submit">
              Confirm Booking
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PublicWorkspacePage;
