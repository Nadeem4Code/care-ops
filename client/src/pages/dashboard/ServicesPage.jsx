import { useEffect, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const emptyForm = {
  name: "",
  description: "",
  durationMinutes: 30,
  price: 0,
  bufferMinutes: 0,
  resources: [],
};

const ServicesPage = () => {
  const { activeWorkspaceId, isOwner, refreshWorkspace } = useAuth();
  const [services, setServices] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadServices = async () => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    setError("");

    try {
      const [servicesRes, inventoryRes] = await Promise.all([
        API.get(`/service-types/workspace/${activeWorkspaceId}`),
        API.get(`/inventory/workspace/${activeWorkspaceId}`),
      ]);
      setServices(servicesRes.data.data || []);
      setInventoryItems(inventoryRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load service types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [activeWorkspaceId]);

  const toggleResource = (itemId) => {
    const exists = form.resources.some((resource) => resource.item === itemId);

    if (exists) {
      setForm({
        ...form,
        resources: form.resources.filter((resource) => resource.item !== itemId),
      });
      return;
    }

    setForm({
      ...form,
      resources: [...form.resources, { item: itemId, quantityPerBooking: 1 }],
    });
  };

  const updateResourceQuantity = (itemId, value) => {
    setForm({
      ...form,
      resources: form.resources.map((resource) =>
        resource.item === itemId
          ? { ...resource, quantityPerBooking: Number(value || 0) }
          : resource,
      ),
    });
  };

  const submitService = async (e) => {
    e.preventDefault();
    if (!activeWorkspaceId || !isOwner) return;

    setSubmitting(true);
    setError("");

    const payload = {
      workspaceId: activeWorkspaceId,
      name: form.name,
      description: form.description,
      durationMinutes: Number(form.durationMinutes),
      price: Number(form.price),
      bufferMinutes: Number(form.bufferMinutes),
      resources: form.resources,
    };

    try {
      if (editingId) {
        await API.put(`/service-types/${editingId}`, payload);
      } else {
        await API.post("/service-types", payload);
      }

      await loadServices();
      await refreshWorkspace();
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save service type");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (service) => {
    setEditingId(service._id);
    setForm({
      name: service.name,
      description: service.description || "",
      durationMinutes: service.durationMinutes,
      price: service.price,
      bufferMinutes: service.bufferMinutes || 0,
      resources: (service.resources || []).map((resource) => ({
        item: resource.item?._id || resource.item,
        quantityPerBooking: resource.quantityPerBooking || 1,
      })),
    });
  };

  const removeService = async (serviceId) => {
    if (!isOwner) return;

    try {
      await API.delete(`/service-types/${serviceId}`);
      await loadServices();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete service type");
    }
  };

  return (
    <section>
      <h2 className="page-title">Services</h2>
      <p className="page-subtitle">Define appointment types, durations, pricing, and resource usage.</p>
      {error && <p className="error-text">{error}</p>}

      {isOwner && (
        <form className="card form-grid spaced-top" onSubmit={submitService}>
          <h3>{editingId ? "Edit service" : "New service"}</h3>

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
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className="inline-fields">
            <label className="form-field">
              Duration (mins)
              <input
                className="input"
                type="number"
                min={15}
                step={15}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                required
              />
            </label>

            <label className="form-field">
              Price
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </label>

            <label className="form-field">
              Buffer (mins)
              <input
                className="input"
                type="number"
                min={0}
                step={5}
                value={form.bufferMinutes}
                onChange={(e) => setForm({ ...form, bufferMinutes: e.target.value })}
              />
            </label>
          </div>

          <div className="list-stack">
            <h4>Inventory usage per booking</h4>
            {inventoryItems.length === 0 ? (
              <p className="muted-text">Create inventory items first to map usage.</p>
            ) : (
              inventoryItems.map((item) => {
                const selected = form.resources.find((resource) => resource.item === item._id);
                return (
                  <div key={item._id} className="split-card">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleResource(item._id)}
                      />
                      {item.name}
                    </label>

                    {selected && (
                      <input
                        className="input compact-input"
                        type="number"
                        min={0}
                        value={selected.quantityPerBooking}
                        onChange={(e) => updateResourceQuantity(item._id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="row-gap">
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingId ? "Update Service" : "Create Service"}
            </button>
            {editingId && (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      <div className="card spaced-top">
        {loading ? (
          <p>Loading service types...</p>
        ) : services.length === 0 ? (
          <p>No services configured yet.</p>
        ) : (
          <div className="list-stack">
            {services.map((service) => (
              <article key={service._id} className="split-card">
                <div>
                  <h4>{service.name}</h4>
                  <p className="muted-text">{service.description || "No description"}</p>
                  <p className="muted-text">
                    {service.durationMinutes} min | ${service.price} | buffer {service.bufferMinutes || 0} min
                  </p>
                  <p className="muted-text">Resources mapped: {service.resources?.length || 0}</p>
                </div>
                {isOwner && (
                  <div className="row-gap">
                    <button type="button" className="ghost-button" onClick={() => startEdit(service)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => removeService(service._id)}
                    >
                      Delete
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

export default ServicesPage;
