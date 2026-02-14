import FormTemplate from "../models/FormTemplate.js";
import FormSubmission from "../models/FormSubmission.js";
import Workspace from "../models/Workspace.js";

export const createFormTemplate = async (req, res) => {
  try {
    const { workspaceId, name, description, fields, serviceTypes, dueInHours } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const formTemplate = await FormTemplate.create({
      workspace: workspaceId,
      name,
      description,
      fields: fields || [],
      serviceTypes: serviceTypes || [],
      dueInHours: dueInHours || 24,
    });

    workspace.onboardingSteps.formsSetup = true;
    await workspace.save();

    res.status(201).json({ success: true, data: formTemplate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFormTemplates = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const forms = await FormTemplate.find({ workspace: workspaceId, isActive: true })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: forms });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFormTemplate = async (req, res) => {
  try {
    const form = await FormTemplate.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: "Form template not found" });
    }

    const workspace = await Workspace.findById(form.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updated = await FormTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFormTemplate = async (req, res) => {
  try {
    const form = await FormTemplate.findById(req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: "Form template not found" });
    }

    const workspace = await Workspace.findById(form.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    form.isActive = false;
    await form.save();

    res.status(200).json({ success: true, message: "Form template deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWorkspaceFormSubmissions = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    await FormSubmission.updateMany(
      { workspace: workspaceId, status: "pending", dueAt: { $lt: new Date() } },
      { $set: { status: "overdue" } },
    );

    const submissions = await FormSubmission.find({ workspace: workspaceId })
      .populate("formTemplate", "name")
      .populate("contact", "name email phone")
      .populate("booking", "bookingDate startTime status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const completeFormSubmission = async (req, res) => {
  try {
    const { answers } = req.body;

    const submission = await FormSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: "Form submission not found" });
    }

    const workspace = await Workspace.findById(submission.workspace);
    const isOwner = workspace?.owner?.toString() === req.user.id;
    const membership = req.user.workspaces.find(
      (ws) => ws.workspace.toString() === submission.workspace.toString(),
    );
    const canManageForms = membership?.permissions?.manageForms === true;

    if (!isOwner && !canManageForms) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to complete forms",
      });
    }

    submission.answers = answers || {};
    submission.status = "completed";
    submission.completedAt = new Date();
    await submission.save();

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitPublicForm = async (req, res) => {
  try {
    const { answers } = req.body;
    const submission = await FormSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: "Form submission not found" });
    }

    if (submission.status === "completed") {
      return res.status(400).json({ success: false, message: "Form already completed" });
    }

    submission.answers = answers || {};
    submission.status = "completed";
    submission.completedAt = new Date();
    await submission.save();

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicForm = async (req, res) => {
  try {
    const submission = await FormSubmission.findById(req.params.id)
      .populate("formTemplate", "name description fields")
      .populate("workspace", "businessName");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Form submission not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        id: submission._id,
        status: submission.status,
        dueAt: submission.dueAt,
        formTemplate: submission.formTemplate,
        workspace: submission.workspace,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
