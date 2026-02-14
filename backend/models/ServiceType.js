import mongoose from "mongoose";

const serviceTypeSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration is required"],
      min: 15,
    },
    price: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#4F46E5", // For calendar display
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bufferMinutes: {
      type: Number,
      default: 0, // Buffer time after appointment
    },
    resources: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantityPerBooking: {
          type: Number,
          default: 1,
          min: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("ServiceType", serviceTypeSchema);
