import express from "express";
import {
  configureContactForm,
  getWorkspaceContacts,
  submitPublicContact,
} from "../controllers/contactController.js";
import { protect, isOwner } from "../middleware/auth.js";
import { belongsToWorkspace, checkPermission } from "../middleware/permissions.js";

const router = express.Router();

router.post("/public", submitPublicContact);
router.post("/configure", protect, isOwner, configureContactForm);

router.get(
  "/workspace/:workspaceId",
  protect,
  belongsToWorkspace,
  checkPermission("viewInbox"),
  getWorkspaceContacts,
);

export default router;
