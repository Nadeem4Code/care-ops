import mongoose from "mongoose";

const integrationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    type: {
      type: String,
      enum: ["email", "sms", "calendar"],
      required: true,
    },
    provider: {
      type: String,
      enum: ["gmail", "sendgrid", "smtp", "twilio", "google-calendar"],
      required: true,
    },
    credentials: {
      type: Map,
      of: String, // Encrypted in production
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    lastSyncAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Integration", integrationSchema);
