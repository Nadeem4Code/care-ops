const INVALID_VALUES = new Set(["", "undefined", "null"]);
const INVALID_HOSTNAMES = new Set(["undefined", "null"]);
const FRONTEND_ENV_KEYS = ["FRONTEND_URL", "APP_URL", "CLIENT_URL", "PUBLIC_APP_URL"];

const normalizeUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (INVALID_VALUES.has(raw.toLowerCase())) return null;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const parsed = new URL(withProtocol);
    if (INVALID_HOSTNAMES.has(parsed.hostname.toLowerCase())) return null;
    return parsed.origin;
  } catch {
    return null;
  }
};

const getEnvFrontendUrl = () => {
  for (const key of FRONTEND_ENV_KEYS) {
    const normalized = normalizeUrl(process.env[key]);
    if (normalized) return normalized;
  }
  return null;
};

export const getFrontendUrl = (options = {}) => {
  const requestOrigin = normalizeUrl(options.requestOrigin);
  if (requestOrigin) return requestOrigin;

  const envUrl = getEnvFrontendUrl();
  if (envUrl) return envUrl;

  const requestHost = String(options.requestHost || "").trim();
  if (requestHost) {
    const protocol = String(options.requestProtocol || "https").replace(/:$/, "");
    const hostUrl = normalizeUrl(`${protocol}://${requestHost}`);
    if (hostUrl) return hostUrl;
  }

  return "http://localhost:5173";
};
