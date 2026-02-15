import Booking from "../models/Booking.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import FormSubmission from "../models/FormSubmission.js";
import Message from "../models/Message.js";
import Workspace from "../models/Workspace.js";
import emailService from "./emailService.js";
import { hasActiveIntegration } from "./integrationGuard.js";
import { logIntegrationFailure, logOpsEvent } from "./opsLogService.js";
import { getFrontendUrl } from "../utils/frontendUrl.js";

let schedulerHandle = null;
let runInProgress = false;

const DEFAULT_BOOKING_REMINDER_MINUTES = 60;
const DEFAULT_FORM_REMINDER_COOLDOWN_HOURS = 12;
const DEFAULT_FORM_REMINDER_MAX = 3;

const toBookingDateTime = (bookingDate, timeValue) => {
  const date = new Date(bookingDate);
  const [hour, minute] = String(timeValue || "00:00")
    .split(":")
    .map(Number);
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
};

const shouldSkipAutomation = async (workspaceId, contactId) => {
  const conversation = await Conversation.findOne({
    workspace: workspaceId,
    contact: contactId,
  });

  if (!conversation) return false;
  return conversation.automationPaused === true;
};

const isContactEmailable = (contact) => {
  return !!contact?.email && !String(contact.email).endsWith("@no-email.local");
};

const getAutomationConfig = (workspace) => {
  const settings = workspace.settings;
  const automation = settings?.get?.("automation") || {};

  return {
    bookingReminderLeadMinutes:
      Number(automation.bookingReminderLeadMinutes) || DEFAULT_BOOKING_REMINDER_MINUTES,
    formReminderCooldownHours:
      Number(automation.formReminderCooldownHours) || DEFAULT_FORM_REMINDER_COOLDOWN_HOURS,
    formReminderMax:
      Number(automation.formReminderMax) || DEFAULT_FORM_REMINDER_MAX,
  };
};

const findOrCreateConversation = async (workspaceId, contactId) => {
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

const processBookingReminders = async () => {
  const now = new Date();
  const workspaces = await Workspace.find({ isActive: true }).select(
    "_id businessName timezone contactEmail settings",
  );

  for (const workspace of workspaces) {
    const canSendEmail = await hasActiveIntegration(workspace._id, "email");
    if (!canSendEmail) continue;

    const config = getAutomationConfig(workspace);
    const bookings = await Booking.find({
      workspace: workspace._id,
      status: "confirmed",
      reminderSent: false,
    }).populate("serviceType", "name durationMinutes");

    for (const booking of bookings) {
      const bookingDateTime = toBookingDateTime(booking.bookingDate, booking.startTime);
      const reminderAt = new Date(
        bookingDateTime.getTime() - config.bookingReminderLeadMinutes * 60 * 1000,
      );

      if (now < reminderAt || now > bookingDateTime) {
        continue;
      }

      const contact = await Contact.findById(booking.contact);
      if (!isContactEmailable(contact)) continue;

      const paused = await shouldSkipAutomation(workspace._id, contact._id);
      if (paused) continue;

      try {
        await emailService.sendBookingReminder(
          booking,
          contact,
          workspace,
          booking.serviceType,
        );

        booking.reminderSent = true;
        await booking.save();

        const conversation = await findOrCreateConversation(workspace._id, contact._id);
        await Message.create({
          workspace: workspace._id,
          conversation: conversation._id,
          contact: contact._id,
          direction: "outbound",
          channel: "email",
          content: `Booking reminder sent for ${booking.serviceType?.name || "service"} on ${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.startTime}.`,
          isAutomated: true,
          status: "sent",
        });

        conversation.lastMessageAt = new Date();
        await conversation.save();

        await logOpsEvent({
          workspaceId: workspace._id,
          level: "info",
          source: "automation",
          message: "Booking reminder sent",
          meta: {
            bookingId: booking._id.toString(),
            contactId: contact._id.toString(),
            channel: "email",
          },
        });
      } catch (error) {
        await logIntegrationFailure(
          workspace._id,
          "email",
          "booking.reminder",
          error,
        );
      }
    }
  }
};

const processFormReminders = async () => {
  const now = new Date();

  await FormSubmission.updateMany(
    { status: "pending", dueAt: { $lt: now } },
    { $set: { status: "overdue" } },
  );

  const workspaces = await Workspace.find({ isActive: true }).select(
    "_id businessName timezone contactEmail settings",
  );

  for (const workspace of workspaces) {
    const canSendEmail = await hasActiveIntegration(workspace._id, "email");
    if (!canSendEmail) continue;

    const config = getAutomationConfig(workspace);
    const cooldownMs = config.formReminderCooldownHours * 60 * 60 * 1000;

    const submissions = await FormSubmission.find({
      workspace: workspace._id,
      status: { $in: ["pending", "overdue"] },
      dueAt: { $lte: now },
      reminderCount: { $lt: config.formReminderMax },
    })
      .populate("contact", "name email")
      .populate("formTemplate", "name");

    for (const submission of submissions) {
      const contact = submission.contact;
      if (!isContactEmailable(contact)) continue;

      const lastReminderAt = submission.lastReminderAt
        ? new Date(submission.lastReminderAt)
        : null;
      if (lastReminderAt && now.getTime() - lastReminderAt.getTime() < cooldownMs) {
        continue;
      }

      const paused = await shouldSkipAutomation(workspace._id, contact._id);
      if (paused) continue;

      const formLink = `${getFrontendUrl()}/forms/${submission._id}`;

      try {
        await emailService.sendEmail({
          to: contact.email,
          subject: `Reminder: complete your form - ${workspace.businessName}`,
          text: `Please complete your pending form: ${submission.formTemplate?.name || "Required form"}\n${formLink}`,
          html: `<p>Please complete your pending form: <strong>${submission.formTemplate?.name || "Required form"}</strong></p><p><a href="${formLink}">Open form</a></p>`,
        });

        submission.reminderCount += 1;
        submission.lastReminderAt = now;
        await submission.save();

        const conversation = await findOrCreateConversation(workspace._id, contact._id);
        await Message.create({
          workspace: workspace._id,
          conversation: conversation._id,
          contact: contact._id,
          direction: "outbound",
          channel: "email",
          content: `Form reminder sent for ${submission.formTemplate?.name || "required form"}.`,
          isAutomated: true,
          status: "sent",
        });

        conversation.lastMessageAt = new Date();
        await conversation.save();

        await logOpsEvent({
          workspaceId: workspace._id,
          level: "info",
          source: "automation",
          message: "Form reminder sent",
          meta: {
            formSubmissionId: submission._id.toString(),
            contactId: contact._id.toString(),
            channel: "email",
          },
        });
      } catch (error) {
        await logIntegrationFailure(workspace._id, "email", "form.reminder", error);
      }
    }
  }
};

export const runAutomationCycle = async () => {
  if (runInProgress) return;
  runInProgress = true;

  try {
    await processBookingReminders();
    await processFormReminders();
  } finally {
    runInProgress = false;
  }
};

export const startAutomationScheduler = () => {
  const enabled = String(process.env.AUTOMATION_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled || schedulerHandle) return;

  const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS || 60_000);
  schedulerHandle = setInterval(() => {
    runAutomationCycle().catch((error) => {
      console.error("Automation cycle failed:", error.message);
    });
  }, intervalMs);

  runAutomationCycle().catch((error) => {
    console.error("Initial automation cycle failed:", error.message);
  });
};
