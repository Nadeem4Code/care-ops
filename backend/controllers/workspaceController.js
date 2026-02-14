import Workspace from "../models/Workspace.js";
import Integration from "../models/Integration.js";
import ServiceType from "../models/ServiceType.js";
import Availability from "../models/Availability.js";

// @desc    Create workspace
// @route   POST /api/workspaces
// @access  Private (Owner only)
export const createWorkspace = async (req, res) => {
  try {
    const { businessName, address, timezone, contactEmail, phone } = req.body;

    // Check if user already has a workspace
    const existingWorkspace = await Workspace.findOne({ owner: req.user.id });
    if (existingWorkspace) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a workspace. Please use that or delete it first.",
      });
    }

    // Create workspace
    const workspace = await Workspace.create({
      owner: req.user.id,
      businessName,
      address,
      timezone: timezone || "America/New_York",
      contactEmail,
      phone,
      onboardingSteps: {
        workspaceCreated: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: workspace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get user's workspace
// @route   GET /api/workspaces/my-workspace
// @access  Private
export const getMyWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ owner: req.user.id }).populate(
      "owner",
      "firstName lastName email",
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "No workspace found. Please create one.",
      });
    }

    res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update workspace
// @route   PUT /api/workspaces/:id
// @access  Private (Owner only)
export const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Check ownership
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this workspace",
      });
    }

    // Update workspace
    const updatedWorkspace = await Workspace.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      data: updatedWorkspace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update onboarding step
// @route   PUT /api/workspaces/:id/onboarding
// @access  Private (Owner only)
export const updateOnboardingStep = async (req, res) => {
  try {
    const { step, completed } = req.body;

    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Check ownership
    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this workspace",
      });
    }

    // Update specific step
    workspace.onboardingSteps[step] = completed;

    // Check if all steps are completed
    const allStepsCompleted = Object.values(workspace.onboardingSteps).every(
      (val) => val === true,
    );

    if (allStepsCompleted) {
      workspace.onboardingCompleted = true;
      workspace.isActive = true;
    }

    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Onboarding step updated",
      data: workspace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get workspace by slug (public for booking pages)
// @route   GET /api/workspaces/slug/:slug
// @access  Public
export const getWorkspaceBySlug = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found or inactive",
      });
    }

    const contactFormSettings = workspace.settings?.get?.("contactForm") || {};

    res.status(200).json({
      success: true,
      data: {
        _id: workspace._id,
        businessName: workspace.businessName,
        address: workspace.address,
        timezone: workspace.timezone,
        contactEmail: workspace.contactEmail,
        phone: workspace.phone,
        contactFormExternalUrl: contactFormSettings.externalFormUrl || "",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Activate workspace after onboarding checks
// @route   POST /api/workspaces/:id/activate
// @access  Private (Owner only)
export const activateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to activate this workspace",
      });
    }

    const [activeIntegrations, activeServices, availabilityCount] = await Promise.all([
      Integration.countDocuments({
        workspace: workspace._id,
        type: { $in: ["email", "sms"] },
        isActive: true,
      }),
      ServiceType.countDocuments({ workspace: workspace._id, isActive: true }),
      Availability.countDocuments({
        workspace: workspace._id,
        isAvailable: true,
      }),
    ]);

    const missing = [];
    if (activeIntegrations < 1) missing.push("Connect at least one communication channel (email or SMS)");
    if (activeServices < 1) missing.push("Create at least one service type");
    if (availabilityCount < 1) missing.push("Define availability for at least one day");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Workspace is not ready for activation",
        data: { missing },
      });
    }

    workspace.onboardingCompleted = true;
    workspace.isActive = true;
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Workspace activated successfully",
      data: workspace,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
