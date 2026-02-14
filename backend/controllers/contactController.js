import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import smsService from "../services/smsService.js";
import { hasActiveIntegration } from "../services/integrationGuard.js";
import { logIntegrationFailure } from "../services/opsLogService.js";

const normalizeChannel = (workspace) => {
  if (workspace.contactEmail) return "email";
  if (workspace.phone) return "sms";
  return "system";
};

export const submitPublicContact = async (req, res) => {
  try {
    const { workspaceSlug, name, email, phone, message } = req.body;

    if (!workspaceSlug || !name || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: "workspaceSlug, name and email or phone are required",
      });
    }

    const workspace = await Workspace.findOne({ slug: workspaceSlug });

    if (!workspace || !workspace.isActive) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found or inactive",
      });
    }

    let contact = null;
    if (email) {
      contact = await Contact.findOne({ workspace: workspace._id, email: email.toLowerCase() });
    }

    if (!contact && phone) {
      contact = await Contact.findOne({ workspace: workspace._id, phone });
    }

    if (!contact) {
      contact = await Contact.create({
        workspace: workspace._id,
        name,
        email: email || `${phone}@no-email.local`,
        phone,
        source: "form",
        status: "new",
      });
    } else {
      contact.name = name || contact.name;
      contact.phone = phone || contact.phone;
      contact.status = "new";
      await contact.save();
    }

    let conversation = await Conversation.findOne({
      workspace: workspace._id,
      contact: contact._id,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        workspace: workspace._id,
        contact: contact._id,
        status: "open",
      });
    }

    if (message) {
      await Message.create({
        workspace: workspace._id,
        conversation: conversation._id,
        contact: contact._id,
        direction: "inbound",
        channel: "system",
        content: message,
        status: "received",
      });

      conversation.unreadCount += 1;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    const welcomeText = `Hi ${name}, thanks for contacting ${workspace.businessName}. Our team will get back to you soon.`;
    const channel = normalizeChannel(workspace);

    if (channel === "email" && email) {
      const canSend = await hasActiveIntegration(workspace._id, "email");
      if (canSend) {
        try {
          await emailService.sendEmail({
            to: email,
            subject: `Welcome to ${workspace.businessName}`,
            text: welcomeText,
            html: `<p>${welcomeText}</p>`,
          });
        } catch (error) {
          await logIntegrationFailure(workspace._id, "email", "welcome", error);
        }
      } else {
        await logIntegrationFailure(workspace._id, "email", "welcome", "No active integration");
      }
    } else if (channel === "sms" && phone) {
      const canSend = await hasActiveIntegration(workspace._id, "sms");
      if (canSend) {
        try {
          await smsService.sendSms({ to: phone, message: welcomeText });
        } catch (error) {
          await logIntegrationFailure(workspace._id, "sms", "welcome", error);
        }
      } else {
        await logIntegrationFailure(workspace._id, "sms", "welcome", "No active integration");
      }
    }

    await Message.create({
      workspace: workspace._id,
      conversation: conversation._id,
      contact: contact._id,
      direction: "outbound",
      channel,
      content: welcomeText,
      isAutomated: true,
      status: "sent",
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    workspace.onboardingSteps.contactFormCreated = true;
    await workspace.save();

    res.status(201).json({
      success: true,
      message: "Contact submitted successfully",
      data: {
        contactId: contact._id,
        conversationId: conversation._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const configureContactForm = async (req, res) => {
  try {
    const { workspaceId, fields, welcomeTemplate, externalFormUrl } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const settings = workspace.settings || new Map();
    settings.set("contactForm", {
      fields: fields || [
        { key: "name", label: "Name", required: true },
        { key: "email", label: "Email", required: false },
        { key: "phone", label: "Phone", required: false },
        { key: "message", label: "Message", required: false },
      ],
      externalFormUrl: externalFormUrl || "",
      welcomeTemplate:
        welcomeTemplate ||
        "Hi {{name}}, thanks for contacting {{businessName}}. Our team will get back to you soon.",
    });

    workspace.settings = settings;
    workspace.onboardingSteps.contactFormCreated = true;
    await workspace.save();

    res.status(200).json({
      success: true,
      message: "Contact form configured",
      data: settings.get("contactForm"),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkspaceContacts = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const contacts = await Contact.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
