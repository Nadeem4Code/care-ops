import mongoose from "mongoose";

const formSubmissionSchema = new mongoose.Schema(
  {
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    formTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
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
      enum: ["pending", "completed", "overdue"],
      default: "pending",
      index: true,
    },
    answers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    dueAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    reminderCount: {
      type: Number,
      default: 0,
    },
    lastReminderAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

formSubmissionSchema.index({ workspace: 1, status: 1 });

export default mongoose.model("FormSubmission", formSubmissionSchema);
