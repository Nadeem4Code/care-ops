import express from "express";
import {
  getConversationMessages,
  getInboxConversations,
  ingestInboundEmail,
  replyToConversation,
  toggleConversationStatus,
} from "../controllers/inboxController.js";
import { protect } from "../middleware/auth.js";
import { belongsToWorkspace, checkPermission } from "../middleware/permissions.js";

const router = express.Router();

// Public inbound email webhook endpoint
router.post("/inbound/email", ingestInboundEmail);

router.get(
  "/workspace/:workspaceId/conversations",
  protect,
  belongsToWorkspace,
  checkPermission("viewInbox"),
  getInboxConversations,
);

router.get("/conversation/:conversationId/messages", protect, getConversationMessages);

router.post(
  "/conversation/:conversationId/reply",
  protect,
  replyToConversation,
);

router.put("/conversation/:conversationId/status", protect, toggleConversationStatus);

export default router;
