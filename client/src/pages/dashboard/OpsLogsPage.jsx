import { useEffect, useState } from "react";
import API, { useAuth } from "../../context/AuthContext";
import { clearOpsLogs, readOpsLogs } from "../../lib/opsLogger";

const OpsLogsPage = () => {
  const { activeWorkspaceId } = useAuth();
  const [logs, setLogs] = useState([]);
  const [levelFilter, setLevelFilter] = useState("all");

  const refresh = async () => {
    if (!activeWorkspaceId) {
      setLogs(readOpsLogs());
      return;
    }

    try {
      const res = await API.get(`/ops-logs/workspace/${activeWorkspaceId}`);
      setLogs(res.data.data || []);
    } catch {
      setLogs(readOpsLogs());
    }
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("ops-log-updated", handler);
    return () => window.removeEventListener("ops-log-updated", handler);
  }, [activeWorkspaceId]);

  const filtered = logs.filter((log) =>
    levelFilter === "all" ? true : log.level === levelFilter,
  );

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "careops-ops-logs.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section>
      <h2 className="page-title">Ops Logs</h2>
          <p className="page-subtitle">Integration failures and operational events.</p>

      <div className="card spaced-top">
        <div className="row-between">
          <div className="row-gap">
            <select
              className="input compact-input"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">All levels</option>
              <option value="error">Error</option>
              <option value="info">Info</option>
            </select>
            <button type="button" className="ghost-button" onClick={refresh}>
              Refresh
            </button>
            <button type="button" className="ghost-button" onClick={exportLogs}>
              Export JSON
            </button>
          </div>

          <button type="button" className="danger-button" onClick={clearOpsLogs}>
            Clear Logs
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="spaced-top">No logs yet.</p>
        ) : (
          <div className="list-stack spaced-top">
            {filtered.map((log) => (
              <article key={log.id} className="split-card">
                <div>
                  <h4>
                    [{log.level}] {log.message}
                  </h4>
                  <p className="muted-text">Source: {log.source}</p>
                  <p className="muted-text">Time: {new Date(log.timestamp).toLocaleString()}</p>
                  {log.meta && (
                    <pre className="log-meta">{JSON.stringify(log.meta, null, 2)}</pre>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default OpsLogsPage;
