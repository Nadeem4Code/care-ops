import Integration from "../models/Integration.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import smsService from "../services/smsService.js";

// @desc    Setup email integration
// @route   POST /api/integrations/email
// @access  Private (Owner only)
export const setupEmailIntegration = async (req, res) => {
  try {
    const { workspaceId, provider, credentials } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Test email connection
    try {
      await emailService.sendEmail({
        to: workspace.contactEmail,
        subject: "Email Integration Successful",
        text: "Your email integration is now active!",
        html: "<p>Your email integration is now active!</p>",
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Failed to send test email. Please check your credentials.",
      });
    }

    // Create or update integration
    let integration = await Integration.findOne({
      workspace: workspaceId,
      type: "email",
    });

    if (integration) {
      integration.provider = provider;
      integration.credentials = credentials;
      integration.isActive = true;
      await integration.save();
    } else {
      integration = await Integration.create({
        workspace: workspaceId,
        type: "email",
        provider,
        credentials,
        isActive: true,
      });
    }

    // Communication step completed.
    workspace.onboardingSteps.emailConfigured = true;
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Email integration setup successful",
      data: {
        id: integration._id,
        type: integration.type,
        provider: integration.provider,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Setup SMS integration
// @route   POST /api/integrations/sms
// @access  Private (Owner only)
export const setupSmsIntegration = async (req, res) => {
  try {
    const { workspaceId, provider, credentials, testPhone } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (testPhone) {
      await smsService.sendSms({
        to: testPhone,
        message: `CareOps SMS integration test for ${workspace.businessName}`,
      });
    }

    let integration = await Integration.findOne({
      workspace: workspaceId,
      type: "sms",
    });

    if (integration) {
      integration.provider = provider || integration.provider;
      integration.credentials = credentials || integration.credentials;
      integration.isActive = true;
      await integration.save();
    } else {
      integration = await Integration.create({
        workspace: workspaceId,
        type: "sms",
        provider: provider || "twilio",
        credentials: credentials || {},
        isActive: true,
      });
    }

    workspace.onboardingSteps.emailConfigured = true;
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "SMS integration setup successful",
      data: {
        id: integration._id,
        type: integration.type,
        provider: integration.provider,
        isActive: integration.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get workspace integrations
// @route   GET /api/integrations/workspace/:workspaceId
// @access  Private
export const getWorkspaceIntegrations = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const integrations = await Integration.find({
      workspace: workspaceId,
    }).select("-credentials"); // Don't send credentials

    res.status(200).json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Test email integration
// @route   POST /api/integrations/email/test
// @access  Private (Owner only)
export const testEmailIntegration = async (req, res) => {
  try {
    const { workspaceId } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await emailService.sendEmail({
      to: workspace.contactEmail,
      subject: "Test Email from CareOps",
      text: "This is a test email. Your integration is working!",
      html: "<h2>Success!</h2><p>This is a test email. Your integration is working!</p>",
    });

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Test SMS integration
// @route   POST /api/integrations/sms/test
// @access  Private (Owner only)
export const testSmsIntegration = async (req, res) => {
  try {
    const { workspaceId, phone } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const targetPhone = phone || workspace.phone;
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    await smsService.sendSms({
      to: targetPhone,
      message: `CareOps SMS test for ${workspace.businessName}`,
    });

    res.status(200).json({
      success: true,
      message: "Test SMS sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
