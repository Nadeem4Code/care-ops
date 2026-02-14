import express from "express";
import {
  createWorkspace,
  getMyWorkspace,
  updateWorkspace,
  updateOnboardingStep,
  getWorkspaceBySlug,
  activateWorkspace,
} from "../controllers/workspaceController.js";
import { protect, isOwner } from "../middleware/auth.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/", protect, isOwner, createWorkspace);
router.get("/my-workspace", protect, getMyWorkspace);
router.put("/:id", protect, isOwner, updateWorkspace);
router.put("/:id/onboarding", protect, isOwner, updateOnboardingStep);
router.post("/:id/activate", protect, isOwner, activateWorkspace);

// Public routes
router.get("/slug/:slug", getWorkspaceBySlug);

export default router;
