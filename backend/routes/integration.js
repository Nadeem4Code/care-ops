import express from "express";
import {
  setupEmailIntegration,
  setupSmsIntegration,
  getWorkspaceIntegrations,
  testEmailIntegration,
  testSmsIntegration,
} from "../controllers/integrationController.js";
import { protect, isOwner } from "../middleware/auth.js";

const router = express.Router();

router.post("/email", protect, isOwner, setupEmailIntegration);
router.post("/email/test", protect, isOwner, testEmailIntegration);
router.post("/sms", protect, isOwner, setupSmsIntegration);
router.post("/sms/test", protect, isOwner, testSmsIntegration);
router.get("/workspace/:workspaceId", protect, getWorkspaceIntegrations);

export default router;
