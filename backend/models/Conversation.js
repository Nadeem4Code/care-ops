import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCount: {
      type: Number,
      default: 0,
    },
    automationPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ workspace: 1, contact: 1 }, { unique: true });

export default mongoose.model("Conversation", conversationSchema);
