import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: ["form", "booking", "manual", "referral"],
      default: "booking",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "booked", "converted", "inactive"],
      default: "new",
    },
    notes: {
      type: String,
    },
    tags: [
      {
        type: String,
      },
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure unique contact per workspace
contactSchema.index({ workspace: 1, email: 1 }, { unique: true });

export default mongoose.model("Contact", contactSchema);
