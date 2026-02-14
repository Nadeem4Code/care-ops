import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0, // 0 = Sunday, 6 = Saturday
      max: 6,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    timeSlots: [
      {
        startTime: {
          type: String,
          required: true, // Format: "09:00"
        },
        endTime: {
          type: String,
          required: true, // Format: "17:00"
        },
      },
    ],
    slotDurationMinutes: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure one availability per workspace per day
availabilitySchema.index({ workspace: 1, dayOfWeek: 1 }, { unique: true });

export default mongoose.model("Availability", availabilitySchema);
