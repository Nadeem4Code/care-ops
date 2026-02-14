import express from "express";
import { getDashboardOverview } from "../controllers/dashboardController.js";
import { protect } from "../middleware/auth.js";
import { belongsToWorkspace } from "../middleware/permissions.js";

const router = express.Router();

router.get("/overview/:workspaceId", protect, belongsToWorkspace, getDashboardOverview);

export default router;
