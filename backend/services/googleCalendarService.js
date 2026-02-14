import { google } from "googleapis";
import Integration from "../models/Integration.js";
import { logIntegrationFailure } from "./opsLogService.js";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

const buildOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth env vars are missing");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

export const getGoogleAuthUrl = (state) => {
  const oauth2Client = buildOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
};

export const exchangeCodeForTokens = async (code) => {
  const oauth2Client = buildOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

const getCalendarClient = (tokens) => {
  const oauth2Client = buildOAuthClient();
  oauth2Client.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: oauth2Client });
};

const buildDateTime = (dateValue, timeValue) => {
  const date = new Date(dateValue);
  const [hour, minute] = timeValue.split(":").map(Number);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const createBookingEvent = async (workspace, booking, contact, serviceType) => {
  const integration = await Integration.findOne({
    workspace: workspace._id,
    type: "calendar",
    provider: "google-calendar",
    isActive: true,
  });

  if (!integration) return null;

  const refreshToken = integration.credentials?.get?.("refresh_token");
  if (!refreshToken) return null;

  const tokens = {
    refresh_token: refreshToken,
    access_token: integration.credentials.get("access_token") || undefined,
    expiry_date: Number(integration.credentials.get("expiry_date")) || undefined,
  };

  const calendarId = integration.config?.get?.("calendarId") || "primary";
  const calendar = getCalendarClient(tokens);

  const startDateTime = buildDateTime(booking.bookingDate, booking.startTime);
  const endDateTime = buildDateTime(booking.bookingDate, booking.endTime);

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${serviceType?.name || "Booking"} - ${workspace.businessName}`,
        description: `Contact: ${contact?.name || contact?.email || "N/A"}`,
        start: {
          dateTime: startDateTime,
          timeZone: workspace.timezone || "UTC",
        },
        end: {
          dateTime: endDateTime,
          timeZone: workspace.timezone || "UTC",
        },
      },
    });

    return event.data;
  } catch (error) {
    await logIntegrationFailure(workspace._id, "calendar", "booking.create", error);
    throw error;
  }
};
