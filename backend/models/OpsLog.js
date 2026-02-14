import mongoose from "mongoose";

const opsLogSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ["info", "error"],
      default: "info",
    },
    source: {
      type: String,
      default: "system",
    },
    message: {
      type: String,
      required: true,
    },
    meta: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

opsLogSchema.index({ workspace: 1, createdAt: -1 });

export default mongoose.model("OpsLog", opsLogSchema);
