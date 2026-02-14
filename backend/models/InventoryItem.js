import mongoose from "mongoose";

const inventoryItemSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      default: "units",
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRestockedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

inventoryItemSchema.index({ workspace: 1, name: 1 }, { unique: true });

export default mongoose.model("InventoryItem", inventoryItemSchema);
