import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";

// Check if user has specific permission
export const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.body?.workspaceId || req.params?.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: "workspaceId is required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid workspaceId",
        });
      }

      // Check if user is owner
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: "Workspace not found",
        });
      }

      if (workspace.owner.toString() === req.user.id) {
        // Owners have all permissions
        return next();
      }

      // Check staff permissions
      if (req.user?.hasPermission?.(workspaceId, permission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${permission}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
};

// Check if user belongs to workspace
export const belongsToWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.body?.workspaceId || req.params?.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: "workspaceId is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspaceId",
      });
    }

    // Check if owner
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (workspace.owner.toString() === req.user.id) {
      return next();
    }

    // Check if staff member
    const isMember = (req.user?.workspaces || []).some(
      (ws) => ws.workspace.toString() === workspaceId,
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
