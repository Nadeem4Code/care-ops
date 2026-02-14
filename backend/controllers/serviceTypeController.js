import ServiceType from "../models/ServiceType.js";
import Workspace from "../models/Workspace.js";

// @desc    Create service type
// @route   POST /api/service-types
// @access  Private (Owner only)
export const createServiceType = async (req, res) => {
  try {
    const {
      workspaceId,
      name,
      description,
      durationMinutes,
      price,
      bufferMinutes,
    } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const serviceType = await ServiceType.create({
      workspace: workspaceId,
      name,
      description,
      durationMinutes,
      price,
      bufferMinutes: bufferMinutes || 0,
      resources: req.body.resources || [],
    });

    workspace.onboardingSteps.bookingSetup = true;
    await workspace.save();

    res.status(201).json({
      success: true,
      message: "Service type created successfully",
      data: serviceType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all service types for workspace
// @route   GET /api/service-types/workspace/:workspaceId
// @access  Public (for booking page)
export const getServiceTypes = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const serviceTypes = await ServiceType.find({
      workspace: workspaceId,
      isActive: true,
    }).sort("name");

    res.status(200).json({
      success: true,
      data: serviceTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update service type
// @route   PUT /api/service-types/:id
// @access  Private (Owner only)
export const updateServiceType = async (req, res) => {
  try {
    const serviceType = await ServiceType.findById(req.params.id);

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        message: "Service type not found",
      });
    }

    // Verify workspace ownership
    const workspace = await Workspace.findById(serviceType.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const updatedServiceType = await ServiceType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Service type updated successfully",
      data: updatedServiceType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete service type
// @route   DELETE /api/service-types/:id
// @access  Private (Owner only)
export const deleteServiceType = async (req, res) => {
  try {
    const serviceType = await ServiceType.findById(req.params.id);

    if (!serviceType) {
      return res.status(404).json({
        success: false,
        message: "Service type not found",
      });
    }

    // Verify workspace ownership
    const workspace = await Workspace.findById(serviceType.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Soft delete
    serviceType.isActive = false;
    await serviceType.save();

    res.status(200).json({
      success: true,
      message: "Service type deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
