const INVALID_ENV_VALUES = new Set(["", "undefined", "null"]);

export const getFrontendUrl = () => {
  const raw = (process.env.FRONTEND_URL || "").trim();
  const normalized = raw.toLowerCase();

  if (!INVALID_ENV_VALUES.has(normalized)) {
    return raw.replace(/\/+$/, "");
  }

  return "http://localhost:5173";
};

