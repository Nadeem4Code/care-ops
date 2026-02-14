import jwt from "jsonwebtoken";
import Workspace from "../models/Workspace.js";
import Integration from "../models/Integration.js";
import { exchangeCodeForTokens, getGoogleAuthUrl } from "../services/googleCalendarService.js";

const buildStateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "10m" });

const parseStateToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

export const startGoogleAuth = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, message: "workspaceId is required" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const state = buildStateToken({ workspaceId, userId: req.user.id });
    const url = getGoogleAuthUrl(state);

    res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    const frontEndUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (!code || !state) {
      return res.redirect(`${frontEndUrl}/dashboard/calendar?connected=0`);
    }

    const payload = parseStateToken(state);
    const { workspaceId, userId } = payload;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== userId) {
      return res.redirect(`${frontEndUrl}/dashboard/calendar?connected=0`);
    }

    const tokens = await exchangeCodeForTokens(code);

    let integration = await Integration.findOne({
      workspace: workspaceId,
      type: "calendar",
      provider: "google-calendar",
    });

    if (!integration) {
      integration = await Integration.create({
        workspace: workspaceId,
        type: "calendar",
        provider: "google-calendar",
        credentials: {},
        config: { calendarId: "primary" },
        isActive: true,
      });
    }

    integration.isActive = true;
    integration.credentials.set("access_token", tokens.access_token || "");
    if (tokens.refresh_token) {
      integration.credentials.set("refresh_token", tokens.refresh_token);
    }
    if (tokens.expiry_date) {
      integration.credentials.set("expiry_date", String(tokens.expiry_date));
    }
    if (tokens.scope) {
      integration.credentials.set("scope", tokens.scope);
    }
    integration.lastSyncAt = new Date();

    if (!integration.config) {
      integration.config = new Map();
    }
    if (!integration.config.get("calendarId")) {
      integration.config.set("calendarId", "primary");
    }

    await integration.save();

    res.redirect(`${frontEndUrl}/dashboard/calendar?connected=1`);
  } catch (error) {
    const frontEndUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontEndUrl}/dashboard/calendar?connected=0`);
  }
};

export const getGoogleStatus = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const integration = await Integration.findOne({
      workspace: workspaceId,
      type: "calendar",
      provider: "google-calendar",
      isActive: true,
    });

    res.status(200).json({
      success: true,
      data: {
        connected: !!integration,
        calendarId: integration?.config?.get?.("calendarId") || "primary",
        provider: integration?.provider || "google-calendar",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
