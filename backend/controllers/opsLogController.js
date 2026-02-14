import OpsLog from "../models/OpsLog.js";
import Workspace from "../models/Workspace.js";

export const getWorkspaceOpsLogs = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    const isOwner = workspace.owner.toString() === req.user.id;
    const isStaff = req.user.workspaces.some(
      (ws) => ws.workspace.toString() === workspaceId,
    );

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const logs = await OpsLog.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
