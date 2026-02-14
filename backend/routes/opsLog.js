import express from "express";
import { protect } from "../middleware/auth.js";
import { getWorkspaceOpsLogs } from "../controllers/opsLogController.js";
import { belongsToWorkspace } from "../middleware/permissions.js";

const router = express.Router();

router.get("/workspace/:workspaceId", protect, belongsToWorkspace, getWorkspaceOpsLogs);

export default router;
