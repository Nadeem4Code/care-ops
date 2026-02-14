import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "sms", "system"],
      default: "system",
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    isAutomated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed", "received"],
      default: "sent",
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);
