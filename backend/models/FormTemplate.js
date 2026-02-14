import mongoose from "mongoose";

const formTemplateSchema = new mongoose.Schema(
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
    description: {
      type: String,
      trim: true,
    },
    fields: [
      {
        label: { type: String, required: true },
        key: { type: String, required: true },
        type: {
          type: String,
          enum: ["text", "textarea", "number", "date", "file", "select"],
          default: "text",
        },
        required: { type: Boolean, default: false },
      },
    ],
    serviceTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceType",
      },
    ],
    dueInHours: {
      type: Number,
      default: 24,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("FormTemplate", formTemplateSchema);
