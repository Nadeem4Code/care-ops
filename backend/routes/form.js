import express from "express";
import {
  completeFormSubmission,
  createFormTemplate,
  deleteFormTemplate,
  getFormTemplates,
  getWorkspaceFormSubmissions,
  getPublicForm,
  submitPublicForm,
  updateFormTemplate,
} from "../controllers/formController.js";
import { protect, isOwner } from "../middleware/auth.js";
import { belongsToWorkspace, checkPermission } from "../middleware/permissions.js";

const router = express.Router();

router.post("/templates", protect, isOwner, createFormTemplate);
router.put("/templates/:id", protect, isOwner, updateFormTemplate);
router.delete("/templates/:id", protect, isOwner, deleteFormTemplate);
router.get("/templates/workspace/:workspaceId", protect, belongsToWorkspace, getFormTemplates);

// Public form submission (no login)
router.get("/public/:id", getPublicForm);
router.post("/public/:id", submitPublicForm);

router.get(
  "/submissions/workspace/:workspaceId",
  protect,
  belongsToWorkspace,
  checkPermission("viewForms"),
  getWorkspaceFormSubmissions,
);

router.put(
  "/submissions/:id/complete",
  protect,
  completeFormSubmission,
);

export default router;
