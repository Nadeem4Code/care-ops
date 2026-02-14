import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["owner", "staff"],
      default: "owner",
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // NEW: For staff members
    workspaces: [
      {
        workspace: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Workspace",
        },
        role: {
          type: String,
          default: "staff",
        },
        permissions: {
          viewInbox: { type: Boolean, default: true },
          replyToMessages: { type: Boolean, default: true },
          manageBookings: { type: Boolean, default: true },
          viewForms: { type: Boolean, default: true },
          manageForms: { type: Boolean, default: false },
          viewInventory: { type: Boolean, default: false },
          manageInventory: { type: Boolean, default: false },
          viewAnalytics: { type: Boolean, default: false },
          manageSettings: { type: Boolean, default: false },
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  // Remove 'next' parameter
  if (!this.isModified("password")) {
    return; // Don't call next()
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // No next() needed here
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user without password
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Method to check if user has permission for a workspace
userSchema.methods.hasPermission = function (workspaceId, permission) {
  const workspace = this.workspaces.find(
    (ws) => ws.workspace.toString() === workspaceId.toString(),
  );

  if (!workspace) return false;
  return workspace.permissions[permission] === true;
};

// Method to get user's role in workspace
userSchema.methods.getRoleInWorkspace = function (workspaceId) {
  const workspace = this.workspaces.find(
    (ws) => ws.workspace.toString() === workspaceId.toString(),
  );

  return workspace ? workspace.role : null;
};

export default mongoose.model("User", userSchema);
