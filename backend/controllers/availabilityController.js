import Availability from "../models/Availability.js";
import Workspace from "../models/Workspace.js";

// @desc    Set availability for a day
// @route   POST /api/availability
// @access  Private (Owner only)
export const setAvailability = async (req, res) => {
  try {
    const {
      workspaceId,
      dayOfWeek,
      isAvailable,
      timeSlots,
      slotDurationMinutes,
    } = req.body;

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Update or create availability
    const availability = await Availability.findOneAndUpdate(
      { workspace: workspaceId, dayOfWeek },
      {
        workspace: workspaceId,
        dayOfWeek,
        isAvailable,
        timeSlots,
        slotDurationMinutes: slotDurationMinutes || 30,
      },
      { upsert: true, new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Availability set successfully",
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get availability for workspace
// @route   GET /api/availability/workspace/:workspaceId
// @access  Public
export const getAvailability = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const availability = await Availability.find({
      workspace: workspaceId,
    }).sort("dayOfWeek");

    res.status(200).json({
      success: true,
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Batch set availability (all days at once)
// @route   POST /api/availability/batch
// @access  Private (Owner only)
export const batchSetAvailability = async (req, res) => {
  try {
    const { workspaceId, schedule } = req.body;
    // schedule = [{ dayOfWeek: 1, isAvailable: true, timeSlots: [...] }, ...]

    // Verify workspace ownership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const bulkOps = schedule.map((day) => ({
      updateOne: {
        filter: { workspace: workspaceId, dayOfWeek: day.dayOfWeek },
        update: {
          workspace: workspaceId,
          dayOfWeek: day.dayOfWeek,
          isAvailable: day.isAvailable,
          timeSlots: day.timeSlots,
          slotDurationMinutes: day.slotDurationMinutes || 30,
        },
        upsert: true,
      },
    }));

    await Availability.bulkWrite(bulkOps);

    // Update workspace onboarding
    workspace.onboardingSteps.bookingSetup = true;
    await workspace.save();

    const availability = await Availability.find({
      workspace: workspaceId,
    }).sort("dayOfWeek");

    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      data: availability,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
