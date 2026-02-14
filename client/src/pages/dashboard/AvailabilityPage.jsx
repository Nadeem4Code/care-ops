import { useEffect, useMemo, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const defaultSchedule = dayNames.map((_, dayOfWeek) => ({
  dayOfWeek,
  isAvailable: dayOfWeek > 0 && dayOfWeek < 6,
  timeSlots: [{ startTime: "09:00", endTime: "17:00" }],
  slotDurationMinutes: 30,
}));

const normalizeSchedule = (availability) =>
  dayNames.map((_, dayOfWeek) => {
    const fromApi = availability.find((item) => item.dayOfWeek === dayOfWeek);
    if (!fromApi) return defaultSchedule[dayOfWeek];

    return {
      dayOfWeek,
      isAvailable: fromApi.isAvailable,
      timeSlots:
        fromApi.timeSlots?.length > 0
          ? fromApi.timeSlots
          : [{ startTime: "09:00", endTime: "17:00" }],
      slotDurationMinutes: fromApi.slotDurationMinutes || 30,
    };
  });

const AvailabilityPage = () => {
  const { activeWorkspaceId, isOwner, refreshWorkspace } = useAuth();
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableDays = useMemo(
    () => schedule.filter((d) => d.isAvailable).length,
    [schedule],
  );

  const loadAvailability = async () => {
    if (!activeWorkspaceId) return;

    setLoading(true);
    setError("");

    try {
      const res = await API.get(`/availability/workspace/${activeWorkspaceId}`);
      const data = res.data.data || [];
      setSchedule(normalizeSchedule(data));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, [activeWorkspaceId]);

  const updateDay = (dayIndex, updates) => {
    setSchedule((current) =>
      current.map((day, index) =>
        index === dayIndex ? { ...day, ...updates } : day,
      ),
    );
  };

  const updateTimeSlot = (dayIndex, field, value) => {
    setSchedule((current) =>
      current.map((day, index) => {
        if (index !== dayIndex) return day;

        const nextSlots = [...day.timeSlots];
        nextSlots[0] = { ...nextSlots[0], [field]: value };
        return { ...day, timeSlots: nextSlots };
      }),
    );
  };

  const saveSchedule = async () => {
    if (!isOwner || !activeWorkspaceId) return;

    setSaving(true);
    setError("");

    try {
      await API.post("/availability/batch", {
        workspaceId: activeWorkspaceId,
        schedule,
      });
      await refreshWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2 className="page-title">Availability</h2>
      <p className="page-subtitle">
        Set your weekly booking windows and slot interval.
      </p>

      {error && <p className="error-text">{error}</p>}

      <div className="card spaced-top">
        {loading ? (
          <p>Loading availability...</p>
        ) : (
          <>
            <p className="muted-text">{availableDays} / 7 days marked available</p>

            <div className="list-stack spaced-top">
              {schedule.map((day, index) => (
                <div key={day.dayOfWeek} className="split-card">
                  <div>
                    <h4>{dayNames[day.dayOfWeek]}</h4>
                    <p className="muted-text">
                      {day.isAvailable
                        ? `${day.timeSlots[0]?.startTime} - ${day.timeSlots[0]?.endTime}`
                        : "Unavailable"}
                    </p>
                  </div>

                  <div className="inline-fields wrap">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={day.isAvailable}
                        disabled={!isOwner}
                        onChange={(e) =>
                          updateDay(index, { isAvailable: e.target.checked })
                        }
                      />
                      Available
                    </label>

                    <input
                      className="input compact-input"
                      type="time"
                      value={day.timeSlots[0]?.startTime || "09:00"}
                      disabled={!isOwner || !day.isAvailable}
                      onChange={(e) =>
                        updateTimeSlot(index, "startTime", e.target.value)
                      }
                    />

                    <input
                      className="input compact-input"
                      type="time"
                      value={day.timeSlots[0]?.endTime || "17:00"}
                      disabled={!isOwner || !day.isAvailable}
                      onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                    />

                    <input
                      className="input compact-input"
                      type="number"
                      min={10}
                      step={5}
                      value={day.slotDurationMinutes}
                      disabled={!isOwner || !day.isAvailable}
                      onChange={(e) =>
                        updateDay(index, {
                          slotDurationMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {isOwner && (
              <button
                type="button"
                className="primary-button spaced-top"
                onClick={saveSchedule}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Availability"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default AvailabilityPage;
