import Booking from "../models/Booking.js";
import Contact from "../models/Contact.js";
import ServiceType from "../models/ServiceType.js";
import Workspace from "../models/Workspace.js";
import Availability from "../models/Availability.js";
import FormTemplate from "../models/FormTemplate.js";
import FormSubmission from "../models/FormSubmission.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import InventoryItem from "../models/InventoryItem.js";
import InventoryEvent from "../models/InventoryEvent.js";
import emailService from "../services/emailService.js";
import { createBookingEvent } from "../services/googleCalendarService.js";
import { hasActiveIntegration } from "../services/integrationGuard.js";
import { logIntegrationFailure } from "../services/opsLogService.js";
import mongoose from "mongoose";

// Helper function to check if slot is available
const isSlotAvailable = async (
  workspaceId,
  date,
  startTime,
  endTime,
  excludeBookingId = null,
) => {
  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);

  const query = {
    workspace: workspaceId,
    bookingDate,
    status: { $in: ["confirmed", "completed"] },
    $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflictingBooking = await Booking.findOne(query);
  return !conflictingBooking;
};

// Helper function to generate available slots for a date
const getAvailableSlotsForDate = async (workspaceId, date, serviceTypeId) => {
  const bookingDate = new Date(date);
  const dayOfWeek = bookingDate.getDay();

  // Get availability for this day
  const availability = await Availability.findOne({
    workspace: workspaceId,
    dayOfWeek,
    isAvailable: true,
  });

  if (!availability || availability.timeSlots.length === 0) {
    return [];
  }

  // Get service type to know duration
  const serviceType = await ServiceType.findById(serviceTypeId);
  if (!serviceType) {
    throw new Error("Service type not found");
  }

  const durationMinutes = serviceType.durationMinutes;
  const slotDuration = availability.slotDurationMinutes;

  // Get existing bookings for this date
  const existingBookings = await Booking.find({
    workspace: workspaceId,
    bookingDate,
    status: { $in: ["confirmed", "completed"] },
  });

  const availableSlots = [];

  // Generate slots from time slots
  for (const timeSlot of availability.timeSlots) {
    const [startHour, startMinute] = timeSlot.startTime.split(":").map(Number);
    const [endHour, endMinute] = timeSlot.endTime.split(":").map(Number);

    let currentTime = startHour * 60 + startMinute; // Convert to minutes
    const endTimeMinutes = endHour * 60 + endMinute;

    while (currentTime + durationMinutes <= endTimeMinutes) {
      const slotStartTime = `${String(Math.floor(currentTime / 60)).padStart(2, "0")}:${String(currentTime % 60).padStart(2, "0")}`;
      const slotEndTime = `${String(Math.floor((currentTime + durationMinutes) / 60)).padStart(2, "0")}:${String((currentTime + durationMinutes) % 60).padStart(2, "0")}`;

      // Check if slot conflicts with existing bookings
      const isConflict = existingBookings.some((booking) => {
        const bookingStart = booking.startTime;
        const bookingEnd = booking.endTime;
        return slotStartTime < bookingEnd && slotEndTime > bookingStart;
      });

      if (!isConflict) {
        availableSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime,
          available: true,
        });
      }

      currentTime += slotDuration;
    }
  }

  return availableSlots;
};

const createOrFetchConversation = async (workspaceId, contactId) => {
  let conversation = await Conversation.findOne({
    workspace: workspaceId,
    contact: contactId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      workspace: workspaceId,
      contact: contactId,
      status: "open",
    });
  }

  return conversation;
};

const createPostBookingForms = async (workspace, booking, serviceType, contact) => {
  const forms = await FormTemplate.find({
    workspace: workspace._id,
    isActive: true,
    serviceTypes: serviceType._id,
  });

  if (!forms.length) return [];

  const submissions = [];

  for (const form of forms) {
    const dueAt = new Date(Date.now() + form.dueInHours * 60 * 60 * 1000);
    const submission = await FormSubmission.create({
      workspace: workspace._id,
      formTemplate: form._id,
      booking: booking._id,
      contact: contact._id,
      dueAt,
      status: "pending",
    });
    submissions.push(submission);

    const formLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/forms/${submission._id}`;
    const canSendForms = await hasActiveIntegration(workspace._id, "email");
    if (canSendForms) {
      try {
        await emailService.sendFormRequest(contact, workspace, formLink);
      } catch (error) {
        await logIntegrationFailure(workspace._id, "email", "form.request", error);
      }
    } else {
      await logIntegrationFailure(workspace._id, "email", "form.request", "No active integration");
    }
  }

  return submissions;
};

const consumeInventoryForBooking = async (workspace, serviceType, userId = null) => {
  if (!serviceType.resources?.length) return [];

  const generatedAlerts = [];

  for (const resource of serviceType.resources) {
    const item = await InventoryItem.findById(resource.item);
    if (!item || !item.isActive) continue;

    const used = Number(resource.quantityPerBooking || 0);
    if (used <= 0) continue;

    item.quantity = Math.max(item.quantity - used, 0);
    await item.save();

    await InventoryEvent.create({
      workspace: workspace._id,
      item: item._id,
      type: "usage",
      quantity: used,
      message: `Auto-usage for booking (${serviceType.name})`,
      createdBy: userId,
    });

    if (item.quantity <= item.lowStockThreshold) {
      const alertMessage = `Low inventory alert: ${item.name} (${item.quantity} ${item.unit})`;
      generatedAlerts.push(alertMessage);

      await InventoryEvent.create({
        workspace: workspace._id,
        item: item._id,
        type: "alert",
        quantity: item.quantity,
        message: alertMessage,
        createdBy: userId,
      });
    }
  }

  if (generatedAlerts.length > 0 && workspace.contactEmail) {
    const canSend = await hasActiveIntegration(workspace._id, "email");
    if (canSend) {
      try {
        await emailService.sendEmail({
          to: workspace.contactEmail,
          subject: `Inventory alert - ${workspace.businessName}`,
          text: generatedAlerts.join("\n"),
          html: `<p>${generatedAlerts.join("<br/>")}</p>`,
        });
      } catch (error) {
        await logIntegrationFailure(workspace._id, "email", "inventory.alert", error);
      }
    } else {
      await logIntegrationFailure(workspace._id, "email", "inventory.alert", "No active integration");
    }
  }
};

// @desc    Create booking (PUBLIC - from booking page)
// @route   POST /api/bookings/public
// @access  Public
export const createPublicBooking = async (req, res) => {
  try {
    const {
      workspaceSlug,
      serviceTypeId,
      bookingDate,
      startTime,
      contactInfo, // { name, email, phone }
    } = req.body;

    // Get workspace by slug
    const workspace = await Workspace.findOne({
      slug: workspaceSlug,
      isActive: true,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found or inactive",
      });
    }

    // Get service type
    const serviceType = await ServiceType.findById(serviceTypeId);
    if (!serviceType || !serviceType.isActive) {
      return res.status(404).json({
        success: false,
        message: "Service type not found or inactive",
      });
    }

    // Calculate end time
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const endMinutes =
      startHour * 60 + startMinute + serviceType.durationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // Check if slot is available
    const available = await isSlotAvailable(
      workspace._id,
      bookingDate,
      startTime,
      endTime,
    );
    if (!available) {
      return res.status(400).json({
        success: false,
        message: "This time slot is no longer available",
      });
    }

    // Create or get contact
    let contact = await Contact.findOne({
      workspace: workspace._id,
      email: contactInfo.email,
    });

    if (!contact) {
      contact = await Contact.create({
        workspace: workspace._id,
        name: contactInfo.name,
        email: contactInfo.email,
        phone: contactInfo.phone,
        source: "booking",
        status: "booked",
      });
    } else {
      // Update contact status
      contact.status = "booked";
      if (contactInfo.phone && !contact.phone) {
        contact.phone = contactInfo.phone;
      }
      await contact.save();
    }

    // Create booking
    const booking = await Booking.create({
      workspace: workspace._id,
      contact: contact._id,
      serviceType: serviceTypeId,
      bookingDate: new Date(bookingDate),
      startTime,
      endTime,
      status: "confirmed",
    });

    // Populate for email
    await booking.populate("serviceType");

    const conversation = await createOrFetchConversation(workspace._id, contact._id);

    await Message.create({
      workspace: workspace._id,
      conversation: conversation._id,
      contact: contact._id,
      direction: "inbound",
      channel: "system",
      content: `Booking requested for ${serviceType.name} on ${bookingDate} at ${startTime}.`,
      status: "received",
    });

    // Send confirmation email
    const canSendConfirmations = await hasActiveIntegration(workspace._id, "email");
    if (canSendConfirmations) {
      try {
        await emailService.sendBookingConfirmation(
          booking,
          contact,
          workspace,
          serviceType,
        );
      } catch (emailError) {
        await logIntegrationFailure(workspace._id, "email", "booking.confirmation", emailError);
      }
    } else {
      await logIntegrationFailure(workspace._id, "email", "booking.confirmation", "No active integration");
    }

    await Message.create({
      workspace: workspace._id,
      conversation: conversation._id,
      contact: contact._id,
      direction: "outbound",
      channel: "email",
      content: `Booking confirmation sent for ${serviceType.name} on ${bookingDate} at ${startTime}.`,
      isAutomated: true,
      status: "sent",
    });

    const formSubmissions = await createPostBookingForms(
      workspace,
      booking,
      serviceType,
      contact,
    );

    if (formSubmissions.length > 0) {
      booking.formsSent = true;
      await booking.save();

      await Message.create({
        workspace: workspace._id,
        conversation: conversation._id,
        contact: contact._id,
        direction: "outbound",
        channel: "email",
        content: `${formSubmissions.length} post-booking form(s) sent.`,
        isAutomated: true,
        status: "sent",
      });
    }

    await consumeInventoryForBooking(workspace, serviceType);

    try {
      const event = await createBookingEvent(workspace, booking, contact, serviceType);
      if (event?.id) {
        booking.metadata = booking.metadata || new Map();
        booking.metadata.set("googleEventId", event.id);
        await booking.save();
      }
    } catch (error) {
      console.error("Failed to sync booking to Google Calendar:", error.message);
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: {
        booking: {
          id: booking._id,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          status: booking.status,
        },
        service: {
          name: serviceType.name,
          duration: serviceType.durationMinutes,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get available slots for a date
// @route   GET /api/bookings/available-slots
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { workspaceSlug, serviceTypeId, date } = req.query;

    const workspace = await Workspace.findOne({
      slug: workspaceSlug,
      isActive: true,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const slots = await getAvailableSlotsForDate(
      workspace._id,
      date,
      serviceTypeId,
    );

    res.status(200).json({
      success: true,
      data: {
        date,
        slots,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all bookings for workspace
// @route   GET /api/bookings/workspace/:workspaceId
// @access  Private (Staff with permission)
export const getBookings = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status, date, startDate, endDate } = req.query;

    // Build query
    const query = { workspace: workspaceId };

    if (status) {
      query.status = status;
    }

    if (date) {
      const bookingDate = new Date(date);
      bookingDate.setHours(0, 0, 0, 0);
      query.bookingDate = bookingDate;
    }

    if (startDate && endDate) {
      query.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const bookings = await Booking.find(query)
      .populate("contact", "name email phone")
      .populate("serviceType", "name durationMinutes")
      .sort({ bookingDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("contact")
      .populate("serviceType")
      .populate("workspace", "businessName address");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Staff with permission)
export const updateBookingStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = status;
    if (notes) {
      booking.notes = notes;
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking status updated",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reschedule booking
// @route   PUT /api/bookings/:id/reschedule
// @access  Private
export const rescheduleBooking = async (req, res) => {
  try {
    const { bookingDate, startTime } = req.body;

    const booking = await Booking.findById(req.params.id).populate(
      "serviceType",
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Calculate new end time
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const endMinutes =
      startHour * 60 + startMinute + booking.serviceType.durationMinutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    // Check if new slot is available
    const available = await isSlotAvailable(
      booking.workspace,
      bookingDate,
      startTime,
      endTime,
      booking._id,
    );

    if (!available) {
      return res.status(400).json({
        success: false,
        message: "This time slot is not available",
      });
    }

    booking.bookingDate = new Date(bookingDate);
    booking.startTime = startTime;
    booking.endTime = endTime;
    booking.reminderSent = false; // Reset reminder

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking rescheduled successfully",
      data: booking,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Cancel booking
// @route   DELETE /api/bookings/:id
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/bookings/workspace/:workspaceId/stats
// @access  Private
export const getBookingStats = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const matchStage = { workspace: new mongoose.Types.ObjectId(workspaceId) };

    if (startDate && endDate) {
      matchStage.bookingDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const stats = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Booking.countDocuments(matchStage);

    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: stats,
        confirmed: stats.find((s) => s._id === "confirmed")?.count || 0,
        completed: stats.find((s) => s._id === "completed")?.count || 0,
        noShow: stats.find((s) => s._id === "no-show")?.count || 0,
        cancelled: stats.find((s) => s._id === "cancelled")?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
