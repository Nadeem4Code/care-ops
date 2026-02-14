import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true, // Format: "09:00"
    },
    endTime: {
      type: String,
      required: true, // Format: "09:30"
    },
    status: {
      type: String,
      enum: ["confirmed", "completed", "no-show", "cancelled"],
      default: "confirmed",
    },
    notes: {
      type: String,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    formsSent: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
bookingSchema.index({ workspace: 1, bookingDate: 1 });
bookingSchema.index({ contact: 1 });
bookingSchema.index({ status: 1 });

export default mongoose.model("Booking", bookingSchema);
