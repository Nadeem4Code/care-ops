import mongoose from "mongoose";

const inventoryEventSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["usage", "restock", "alert"],
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

inventoryEventSchema.index({ workspace: 1, createdAt: -1 });

export default mongoose.model("InventoryEvent", inventoryEventSchema);
