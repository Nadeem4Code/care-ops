import Integration from "../models/Integration.js";

export const getActiveIntegration = async (workspaceId, type) => {
  return Integration.findOne({
    workspace: workspaceId,
    type,
    isActive: true,
  });
};

export const hasActiveIntegration = async (workspaceId, type) => {
  const integration = await getActiveIntegration(workspaceId, type);
  return !!integration;
};
