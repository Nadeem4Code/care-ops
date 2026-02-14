import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import smsService from "../services/smsService.js";
import { hasActiveIntegration } from "../services/integrationGuard.js";
import { logIntegrationFailure } from "../services/opsLogService.js";
import { logOpsEvent } from "../services/opsLogService.js";

const getPreferredChannel = (contact) => {
  if (contact.email && !contact.email.endsWith("@no-email.local")) return "email";
  if (contact.phone) return "sms";
  return "system";
};

const canAccessConversation = async (conversation, user, requiredPermission = null) => {
  const workspace = await Workspace.findById(conversation.workspace);
  if (!workspace) return false;

  if (workspace.owner.toString() === user.id) return true;

  const membership = user.workspaces.find(
    (ws) => ws.workspace.toString() === conversation.workspace.toString(),
  );

  if (!membership) return false;
  if (!requiredPermission) return true;

  return membership.permissions?.[requiredPermission] === true;
};

export const getInboxConversations = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const conversations = await Conversation.find({ workspace: workspaceId })
      .populate("contact", "name email phone status")
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const allowed = await canAccessConversation(conversation, req.user, "viewInbox");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .limit(500);
    if (conversation) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const replyToConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required" });
    }

    const conversation = await Conversation.findById(conversationId).populate("contact");

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const allowed = await canAccessConversation(conversation, req.user, "replyToMessages");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const workspace = await Workspace.findById(conversation.workspace);
    const contact = await Contact.findById(conversation.contact._id || conversation.contact);
    const channel = getPreferredChannel(contact);

    if (channel === "email") {
      const canSend = await hasActiveIntegration(workspace._id, "email");
      if (canSend) {
        try {
          await emailService.sendEmail({
            to: contact.email,
            subject: `Message from ${workspace.businessName}`,
            text: content,
            html: `<p>${content}</p>`,
          });
        } catch (error) {
          await logIntegrationFailure(workspace._id, "email", "reply", error);
        }
      } else {
        await logIntegrationFailure(workspace._id, "email", "reply", "No active integration");
      }
    } else if (channel === "sms") {
      const canSend = await hasActiveIntegration(workspace._id, "sms");
      if (canSend) {
        try {
          await smsService.sendSms({ to: contact.phone, message: content });
        } catch (error) {
          await logIntegrationFailure(workspace._id, "sms", "reply", error);
        }
      } else {
        await logIntegrationFailure(workspace._id, "sms", "reply", "No active integration");
      }
    }

    const message = await Message.create({
      workspace: conversation.workspace,
      conversation: conversation._id,
      contact: contact._id,
      direction: "outbound",
      channel,
      content,
      isAutomated: false,
      status: "sent",
    });

    // Required behavior: manual staff reply pauses automation for this thread.
    conversation.automationPaused = true;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    res.status(201).json({
      success: true,
      message: "Reply sent",
      data: message,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleConversationStatus = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!["open", "closed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const allowed = await canAccessConversation(conversation, req.user, "viewInbox");
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    conversation.status = status;
    await conversation.save();

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const stripHtml = (value = "") =>
  String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const extractEmail = (value = "") => {
  const raw = String(value).trim();
  const match = raw.match(/<([^>]+)>/);
  return normalizeEmail(match ? match[1] : raw);
};

const extractName = (value = "") => {
  const raw = String(value).trim();
  const match = raw.match(/^(.+?)\s*<[^>]+>$/);
  return (match?.[1] || raw.split("@")[0] || "Customer").replace(/["']/g, "").trim();
};

// Inbound email webhook (provider -> CareOps)
// Expected body: { workspaceId, from, fromName?, subject?, text?, html? }
export const ingestInboundEmail = async (req, res) => {
  try {
    const token = req.headers["x-inbound-token"] || req.query.token;
    if (process.env.INBOUND_PARSE_TOKEN && token !== process.env.INBOUND_PARSE_TOKEN) {
      return res.status(401).json({ success: false, message: "Invalid inbound token" });
    }

    const { workspaceId, from, fromName, subject, text, html } = req.body;
    if (!workspaceId || !from) {
      return res.status(400).json({
        success: false,
        message: "workspaceId and from are required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || !workspace.isActive) {
      return res.status(404).json({ success: false, message: "Workspace not found or inactive" });
    }

    const senderEmail = extractEmail(from);
    if (!senderEmail || !senderEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Invalid sender email" });
    }

    const content = String(text || "").trim() || stripHtml(html || "");
    if (!content) {
      return res.status(400).json({ success: false, message: "Inbound email content is empty" });
    }

    let contact = await Contact.findOne({
      workspace: workspace._id,
      email: normalizeEmail(senderEmail),
    });

    if (!contact) {
      contact = await Contact.create({
        workspace: workspace._id,
        name: (fromName && String(fromName).trim()) || extractName(from),
        email: normalizeEmail(senderEmail),
        source: "manual",
        status: "new",
      });
    } else if (!contact.name || contact.name === "Customer") {
      contact.name = (fromName && String(fromName).trim()) || extractName(from);
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

    const message = await Message.create({
      workspace: workspace._id,
      conversation: conversation._id,
      contact: contact._id,
      direction: "inbound",
      channel: "email",
      content,
      status: "received",
      metadata: {
        subject: String(subject || "").trim(),
        source: "inbound-webhook",
      },
    });

    conversation.unreadCount += 1;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await logOpsEvent({
      workspaceId: workspace._id,
      level: "info",
      source: "inbound-email",
      message: "Inbound email ingested",
      meta: {
        contactId: contact._id.toString(),
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        contactId: contact._id,
        conversationId: conversation._id,
        messageId: message._id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
