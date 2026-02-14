import express from "express";
import {
  inviteTeamMember,
  getInvitation,
  acceptInvitation,
  getTeamMembers,
  updateMemberPermissions,
  removeTeamMember,
  cancelInvitation,
  resendInvitation,
} from "../controllers/teamController.js";
import { protect, isOwner } from "../middleware/auth.js";

const router = express.Router();

// Owner only routes
router.post("/invite", protect, isOwner, inviteTeamMember);
router.put("/:memberId/permissions", protect, isOwner, updateMemberPermissions);
router.delete("/:memberId", protect, isOwner, removeTeamMember);
router.delete("/invitation/:invitationId", protect, isOwner, cancelInvitation);
router.post(
  "/invitation/:invitationId/resend",
  protect,
  isOwner,
  resendInvitation,
);

// Staff can view team
router.get("/workspace/:workspaceId", protect, getTeamMembers);

// Public routes (for accepting invitations)
router.get("/invitation/:token", getInvitation);
router.post("/accept-invitation", acceptInvitation);

export default router;
