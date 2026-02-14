import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    timezone: {
      type: String,
      default: "America/New_York",
    },
    contactEmail: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: false, // Becomes true after onboarding completion
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    onboardingSteps: {
      workspaceCreated: { type: Boolean, default: false },
      emailConfigured: { type: Boolean, default: false },
      contactFormCreated: { type: Boolean, default: false },
      bookingSetup: { type: Boolean, default: false },
      formsSetup: { type: Boolean, default: false },
      inventorySetup: { type: Boolean, default: false },
    },
    settings: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// Generate slug before saving
// Workspace.js
workspaceSchema.pre('save', async function() { // Remove 'next'
  if (this.isModified('businessName') && !this.slug) {
    let slug = this.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slugExists = await mongoose.model('Workspace').findOne({ slug });
    let counter = 1;
    
    while (slugExists) {
      let tempSlug = `${slug}-${counter}`;
      slugExists = await mongoose.model('Workspace').findOne({ slug: tempSlug });
      if (!slugExists) {
        slug = tempSlug;
      }
      counter++;
    }
    
    this.slug = slug;
  }
  // No next() call needed for async functions
});
export default mongoose.model("Workspace", workspaceSchema);
