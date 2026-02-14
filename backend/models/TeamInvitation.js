import mongoose from "mongoose";
import crypto from "crypto";

const teamInvitationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      default: "staff",
    },
    permissions: {
      viewInbox: { type: Boolean, default: true },
      replyToMessages: { type: Boolean, default: true },
      manageBookings: { type: Boolean, default: true },
      viewForms: { type: Boolean, default: true },
      manageForms: { type: Boolean, default: false },
      viewInventory: { type: Boolean, default: false },
      manageInventory: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
    },
    token: {
      type: String,
      unique: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    acceptedAt: {
      type: Date,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

// Generate unique token before saving
teamInvitationSchema.pre("save", async function () {
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString("hex");
  }
  // Mongoose sees 'async' and knows to move on when the function finishes
});

// Check if invitation is valid
teamInvitationSchema.methods.isValid = function () {
  return this.status === "pending" && this.expiresAt > new Date();
};

// Index for cleanup
teamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("TeamInvitation", teamInvitationSchema);
