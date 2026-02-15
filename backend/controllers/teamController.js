import TeamInvitation from "../models/TeamInvitation.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import jwt from "jsonwebtoken";
import { getFrontendUrl } from "../utils/frontendUrl.js";

const getRequestFrontendContext = (req) => ({
  requestOrigin: req.get("origin"),
  requestProtocol: req.get("x-forwarded-proto") || req.protocol,
  requestHost: req.get("x-forwarded-host") || req.get("host"),
});

const validateInvitationState = async (invitation) => {
  if (!invitation) {
    return { valid: false, message: "Invitation not found", statusCode: 404 };
  }

  if (invitation.status === "accepted") {
    return {
      valid: false,
      message: "This invitation has already been accepted. Please log in.",
      statusCode: 400,
    };
  }

  if (invitation.status === "cancelled") {
    return {
      valid: false,
      message: "This invitation was cancelled. Ask the owner to send a new one.",
      statusCode: 400,
    };
  }

  if (invitation.expiresAt <= new Date()) {
    if (invitation.status === "pending") {
      invitation.status = "expired";
      await invitation.save();
    }
    return {
      valid: false,
      message: "This invitation has expired. Ask the owner to resend it.",
      statusCode: 400,
    };
  }

  if (invitation.status !== "pending") {
    return {
      valid: false,
      message: "This invitation is no longer valid.",
      statusCode: 400,
    };
  }

  return { valid: true };
};

// @desc    Invite team member
// @route   POST /api/team/invite
// @access  Private (Owner only)
export const inviteTeamMember = async (req, res) => {
  try {
    const { workspaceId, email, firstName, lastName, permissions } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to invite team members to this workspace",
      });
    }

    // Check if user already exists with this email
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // Check if already a member
      const isMember = existingUser.workspaces.some(
        (ws) => ws.workspace.toString() === workspaceId,
      );

      if (isMember) {
        return res.status(400).json({
          success: false,
          message: "User is already a team member",
        });
      }
    }

    // Check if there's already a pending invitation
    const existingInvitation = await TeamInvitation.findOne({
      workspace: workspaceId,
      email,
      status: "pending",
    });

    if (existingInvitation && existingInvitation.isValid()) {
      return res.status(400).json({
        success: false,
        message: "An invitation has already been sent to this email",
      });
    }

    // Create invitation
    const invitation = await TeamInvitation.create({
      workspace: workspaceId,
      invitedBy: req.user.id,
      email,
      firstName,
      lastName,
      role: "staff",
      permissions: permissions || {
        viewInbox: true,
        replyToMessages: true,
        manageBookings: true,
        viewForms: true,
        manageForms: false,
        viewInventory: false,
        manageInventory: false,
        viewAnalytics: false,
        manageSettings: false,
      },
    });

    // Send invitation email
    const frontendUrl = getFrontendUrl(getRequestFrontendContext(req));
    const inviteLink = `${frontendUrl}/accept-invitation/${invitation.token}`;

    await emailService.sendEmail({
      to: email,
      subject: `You've been invited to join ${workspace.businessName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; }
              .button { 
                display: inline-block; 
                padding: 12px 24px; 
                background: #4F46E5; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 20px 0; 
              }
              .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Team Invitation</h1>
              </div>
              <div class="content">
                <h2>Hi ${firstName || "there"}!</h2>
                <p><strong>${req.user.firstName} ${req.user.lastName}</strong> has invited you to join <strong>${workspace.businessName}</strong> as a team member.</p>
                
                <p>As a team member, you'll be able to:</p>
                <ul>
                  ${permissions?.viewInbox ? "<li>View and manage customer messages</li>" : ""}
                  ${permissions?.manageBookings ? "<li>Manage bookings and appointments</li>" : ""}
                  ${permissions?.viewForms ? "<li>Track form submissions</li>" : ""}
                  ${permissions?.viewInventory ? "<li>Monitor inventory</li>" : ""}
                </ul>
                
                <a href="${inviteLink}" class="button">Accept Invitation</a>
                
                <p><small>This invitation will expire in 7 days.</small></p>
                <p><small>If you didn't expect this invitation, you can safely ignore this email.</small></p>
              </div>
              <div class="footer">
                <p>CareOps - Unified Operations Platform</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `You've been invited to join ${workspace.businessName}. Click here to accept: ${inviteLink}`,
    });

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        id: invitation._id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get invitation by token
// @route   GET /api/team/invitation/:token
// @access  Public
export const getInvitation = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await TeamInvitation.findOne({ token })
      .populate("workspace", "businessName address contactEmail")
      .populate("invitedBy", "firstName lastName email");

    const validation = await validateInvitationState(invitation);
    if (!validation.valid) {
      return res.status(validation.statusCode).json({
        success: false,
        message: validation.message,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        workspace: invitation.workspace,
        invitedBy: invitation.invitedBy,
        email: invitation.email,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        permissions: invitation.permissions,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Accept invitation (creates user or adds workspace to existing user)
// @route   POST /api/team/accept-invitation
// @access  Public
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    // Find invitation
    const invitation = await TeamInvitation.findOne({ token });

    const validation = await validateInvitationState(invitation);
    if (!validation.valid) {
      return res.status(validation.statusCode).json({
        success: false,
        message: validation.message,
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // Existing user - just add workspace
      user.workspaces.push({
        workspace: invitation.workspace,
        role: "staff",
        permissions: invitation.permissions,
      });

      await user.save();
    } else {
      // New user - create account
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required for new users",
        });
      }

      user = await User.create({
        email: invitation.email,
        password,
        firstName: firstName || invitation.firstName,
        lastName: lastName || invitation.lastName,
        role: "staff",
        workspaces: [
          {
            workspace: invitation.workspace,
            role: "staff",
            permissions: invitation.permissions,
          },
        ],
      });
    }

    // Update invitation status
    invitation.status = "accepted";
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = user._id;
    await invitation.save();

    // Generate token for immediate login
    const authToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    });

    res.status(200).json({
      success: true,
      message: "Invitation accepted successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        token: authToken,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all team members for a workspace
// @route   GET /api/team/workspace/:workspaceId
// @access  Private (Owner or Staff of that workspace)
export const getTeamMembers = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify user has access to this workspace
    const workspace = await Workspace.findById(workspaceId);

    const isOwner = workspace.owner.toString() === req.user.id;
    const isStaff = req.user.workspaces.some(
      (ws) => ws.workspace.toString() === workspaceId,
    );

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view team members",
      });
    }

    // Get all users who are members of this workspace
    const teamMembers = await User.find({
      "workspaces.workspace": workspaceId,
    }).select("firstName lastName email role workspaces createdAt");

    // Filter to show only this workspace's data
    const members = teamMembers.map((user) => {
      const workspaceData = user.workspaces.find(
        (ws) => ws.workspace.toString() === workspaceId,
      );

      return {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: workspaceData.role,
        permissions: workspaceData.permissions,
        joinedAt: workspaceData.joinedAt,
      };
    });

    // Get pending invitations
    const pendingInvitations = await TeamInvitation.find({
      workspace: workspaceId,
      status: "pending",
    }).select("email firstName lastName permissions createdAt expiresAt");

    res.status(200).json({
      success: true,
      data: {
        members,
        pendingInvitations,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update team member permissions
// @route   PUT /api/team/:memberId/permissions
// @access  Private (Owner only)
export const updateMemberPermissions = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { workspaceId, permissions } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update permissions",
      });
    }

    // Find user
    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    // Find and update workspace permissions
    const workspaceIndex = user.workspaces.findIndex(
      (ws) => ws.workspace.toString() === workspaceId,
    );

    if (workspaceIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this workspace",
      });
    }

    user.workspaces[workspaceIndex].permissions = {
      ...user.workspaces[workspaceIndex].permissions,
      ...permissions,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "Permissions updated successfully",
      data: {
        permissions: user.workspaces[workspaceIndex].permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove team member
// @route   DELETE /api/team/:memberId
// @access  Private (Owner only)
export const removeTeamMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { workspaceId } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to remove team members",
      });
    }

    // Cannot remove owner
    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove workspace owner",
      });
    }

    // Find user and remove workspace
    const user = await User.findById(memberId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Team member not found",
      });
    }

    user.workspaces = user.workspaces.filter(
      (ws) => ws.workspace.toString() !== workspaceId,
    );

    await user.save();

    res.status(200).json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel invitation
// @route   DELETE /api/team/invitation/:invitationId
// @access  Private (Owner only)
export const cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await TeamInvitation.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    // Verify workspace ownership
    const workspace = await Workspace.findById(invitation.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this invitation",
      });
    }

    invitation.status = "cancelled";
    await invitation.save();

    res.status(200).json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Resend invitation
// @route   POST /api/team/invitation/:invitationId/resend
// @access  Private (Owner only)
export const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const invitation = await TeamInvitation.findById(invitationId).populate(
      "workspace",
      "businessName",
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    // Verify workspace ownership
    const workspace = await Workspace.findById(invitation.workspace._id);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Can only resend pending invitations",
      });
    }

    // Extend expiration
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    // Resend email
    const frontendUrl = getFrontendUrl(getRequestFrontendContext(req));
    const inviteLink = `${frontendUrl}/accept-invitation/${invitation.token}`;

    await emailService.sendEmail({
      to: invitation.email,
      subject: `Reminder: You've been invited to join ${workspace.businessName}`,
      html: `
        <p>This is a reminder that you've been invited to join <strong>${workspace.businessName}</strong>.</p>
        <a href="${inviteLink}">Accept Invitation</a>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Invitation resent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
