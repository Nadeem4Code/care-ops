import OpsLog from "../models/OpsLog.js";

export const logOpsEvent = async ({
  workspaceId,
  level = "info",
  source = "system",
  message,
  meta = {},
}) => {
  if (!workspaceId || !message) return null;
  return OpsLog.create({
    workspace: workspaceId,
    level,
    source,
    message,
    meta,
  });
};

export const logIntegrationFailure = async (workspaceId, channel, action, error) => {
  return logOpsEvent({
    workspaceId,
    level: "error",
    source: "integration",
    message: `Failed to send ${channel} for ${action}`,
    meta: {
      channel,
      action,
      error: error?.message || String(error),
    },
  });
};
