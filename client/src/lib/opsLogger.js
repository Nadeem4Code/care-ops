const STORAGE_KEY = "careops_ops_logs";

const safeParse = (value) => {
  try {
    return JSON.parse(value) || [];
  } catch {
    return [];
  }
};

export const readOpsLogs = () => {
  return safeParse(localStorage.getItem(STORAGE_KEY));
};

export const appendOpsLog = (entry) => {
  const logs = readOpsLogs();
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      level: "info",
      source: "ui",
      message: "",
      ...entry,
    },
    ...logs,
  ].slice(0, 400);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("ops-log-updated"));
};

export const clearOpsLogs = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("ops-log-updated"));
};

export const logApiError = (error, context = {}) => {
  appendOpsLog({
    level: "error",
    source: context.source || "api",
    message: error.response?.data?.message || error.message || "Unknown API error",
    meta: {
      method: error.config?.method,
      url: error.config?.url,
      status: error.response?.status,
      ...context.meta,
    },
  });
};

export default {
  readOpsLogs,
  appendOpsLog,
  clearOpsLogs,
  logApiError,
};
