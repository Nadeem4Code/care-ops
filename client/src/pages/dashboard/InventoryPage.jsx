import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const emptyItem = {
  name: "",
  sku: "",
  unit: "units",
  quantity: 0,
  lowStockThreshold: 5,
};

const InventoryPage = () => {
  const { activeWorkspaceId, isOwner } = useAuth();
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyItem);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!activeWorkspaceId) return;

    try {
      const [itemsRes, alertsRes, servicesRes] = await Promise.all([
        API.get(`/inventory/workspace/${activeWorkspaceId}`),
        API.get(`/inventory/workspace/${activeWorkspaceId}/alerts`),
        API.get(`/service-types/workspace/${activeWorkspaceId}`),
      ]);

      setItems(itemsRes.data.data || []);
      setAlerts(alertsRes.data.data.lowStockItems || []);
      setServices(servicesRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inventory");
    }
  };

  useEffect(() => {
    loadData();
  }, [activeWorkspaceId]);

  const forecastRows = useMemo(() => {
    if (!items.length || !services.length) return [];

    return items
      .map((item) => {
        const usages = services
          .flatMap((service) =>
            (service.resources || [])
              .filter((resource) => {
                const resourceItemId =
                  typeof resource.item === "string"
                    ? resource.item
                    : resource.item?._id;
                return resourceItemId === item._id;
              })
              .map((resource) => ({
                serviceName: service.name,
                quantityPerBooking: Number(resource.quantityPerBooking || 0),
              })),
          )
          .filter((usage) => usage.quantityPerBooking > 0);

        const totalPerCycle = usages.reduce(
          (sum, usage) => sum + usage.quantityPerBooking,
          0,
        );
        const minPerBooking = usages.length
          ? Math.min(...usages.map((u) => u.quantityPerBooking))
          : 0;

        return {
          itemId: item._id,
          itemName: item.name,
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          mappedServices: usages.length,
          totalPerCycle,
          conservativeBookingsLeft:
            totalPerCycle > 0
              ? Math.floor(Number(item.quantity || 0) / totalPerCycle)
              : null,
          maxBookingsLeft:
            minPerBooking > 0
              ? Math.floor(Number(item.quantity || 0) / minPerBooking)
              : null,
        };
      })
      .sort((a, b) => {
        if (a.conservativeBookingsLeft === null) return 1;
        if (b.conservativeBookingsLeft === null) return -1;
        return a.conservativeBookingsLeft - b.conservativeBookingsLeft;
      });
  }, [items, services]);

  const createItem = async (e) => {
    e.preventDefault();
    if (!isOwner) return;

    try {
      await API.post("/inventory", {
        workspaceId: activeWorkspaceId,
        ...form,
      });
      setForm(emptyItem);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create inventory item");
    }
  };

  const recordUsage = async (itemId) => {
    try {
      await API.post(`/inventory/${itemId}/usage`, {
        workspaceId: activeWorkspaceId,
        quantity: 1,
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record usage");
    }
  };

  const restock = async (itemId) => {
    try {
      await API.post(`/inventory/${itemId}/restock`, {
        workspaceId: activeWorkspaceId,
        quantity: 5,
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to restock item");
    }
  };

  return (
    <section>
      <h2 className="page-title">Inventory</h2>
      <p className="page-subtitle">Track resources and low-stock risks.</p>
      {error && <p className="error-text">{error}</p>}

      {isOwner && (
        <form className="card form-grid spaced-top" onSubmit={createItem}>
          <h3>Add inventory item</h3>

          <div className="inline-fields">
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
              SKU
              <input
                className="input"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </label>
          </div>

          <div className="inline-fields">
            <label className="form-field">
              Quantity
              <input
                className="input"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </label>

            <label className="form-field">
              Low-stock threshold
              <input
                className="input"
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })}
              />
            </label>
          </div>

          <button className="primary-button" type="submit">Create Item</button>
        </form>
      )}

      <div className="card spaced-top">
        <h3>Current stock</h3>
        {items.length === 0 ? (
          <p>No inventory items yet.</p>
        ) : (
          <div className="list-stack spaced-top">
            {items.map((item) => (
              <article key={item._id} className="split-card">
                <div>
                  <h4>{item.name}</h4>
                  <p className="muted-text">Qty: {item.quantity} {item.unit}</p>
                  <p className="muted-text">Threshold: {item.lowStockThreshold}</p>
                </div>
                <div className="row-gap">
                  <button type="button" className="ghost-button" onClick={() => recordUsage(item._id)}>
                    Use 1
                  </button>
                  {isOwner && (
                    <button type="button" className="primary-button" onClick={() => restock(item._id)}>
                      Restock +5
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="card spaced-top">
        <h3>Usage forecasting</h3>
        {forecastRows.length === 0 ? (
          <p>No forecast data. Create inventory items and map resources in Services.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Mapped services</th>
                  <th>Total use per service-cycle</th>
                  <th>Conservative bookings left</th>
                  <th>Max bookings left</th>
                </tr>
              </thead>
              <tbody>
                {forecastRows.map((row) => (
                  <tr key={row.itemId}>
                    <td>
                      {row.itemName} ({row.quantity} {row.unit})
                    </td>
                    <td>{row.mappedServices}</td>
                    <td>{row.totalPerCycle > 0 ? row.totalPerCycle : "-"}</td>
                    <td>
                      {row.conservativeBookingsLeft === null
                        ? "-"
                        : row.conservativeBookingsLeft}
                    </td>
                    <td>{row.maxBookingsLeft === null ? "-" : row.maxBookingsLeft}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card spaced-top">
        <h3>Alerts</h3>
        {alerts.length === 0 ? (
          <p>No low-stock alerts.</p>
        ) : (
          <div className="list-stack spaced-top">
            {alerts.map((item) => (
              <article key={item._id} className="split-card">
                <div>
                  <h4>{item.name}</h4>
                  <p className="error-text">Low stock: {item.quantity} remaining</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default InventoryPage;
