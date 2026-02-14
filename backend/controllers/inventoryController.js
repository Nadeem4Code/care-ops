import InventoryEvent from "../models/InventoryEvent.js";
import InventoryItem from "../models/InventoryItem.js";
import Workspace from "../models/Workspace.js";
import emailService from "../services/emailService.js";
import { hasActiveIntegration } from "../services/integrationGuard.js";
import { logIntegrationFailure } from "../services/opsLogService.js";

const maybeEmitLowStockAlert = async (item, workspace, createdBy) => {
  if (item.quantity > item.lowStockThreshold) return;

  await InventoryEvent.create({
    workspace: workspace._id,
    item: item._id,
    type: "alert",
    quantity: item.quantity,
    message: `Low inventory alert for ${item.name}. Current quantity: ${item.quantity}`,
    createdBy,
  });

  if (workspace.contactEmail) {
    const canSend = await hasActiveIntegration(workspace._id, "email");
    if (canSend) {
      try {
        await emailService.sendEmail({
          to: workspace.contactEmail,
          subject: `Low inventory: ${item.name}`,
          text: `Inventory is below threshold. ${item.name}: ${item.quantity} ${item.unit}.`,
          html: `<p>Inventory is below threshold. <strong>${item.name}</strong>: ${item.quantity} ${item.unit}.</p>`,
        });
      } catch (error) {
        await logIntegrationFailure(workspace._id, "email", "inventory.alert", error);
      }
    } else {
      await logIntegrationFailure(workspace._id, "email", "inventory.alert", "No active integration");
    }
  }
};

export const createInventoryItem = async (req, res) => {
  try {
    const { workspaceId, name, sku, unit, quantity, lowStockThreshold } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const item = await InventoryItem.create({
      workspace: workspaceId,
      name,
      sku,
      unit: unit || "units",
      quantity: Number(quantity || 0),
      lowStockThreshold: Number(lowStockThreshold || 5),
    });

    workspace.onboardingSteps.inventorySetup = true;
    await workspace.save();

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInventoryItems = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const items = await InventoryItem.find({ workspace: workspaceId, isActive: true }).sort({ name: 1 });

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    const workspace = await Workspace.findById(item.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updated = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await maybeEmitLowStockAlert(updated, workspace, req.user.id);

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordInventoryUsage = async (req, res) => {
  try {
    const { quantity, workspaceId, message } = req.body;

    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    const workspace = await Workspace.findById(workspaceId || item.workspace);
    const isOwner = workspace.owner.toString() === req.user.id;
    const canManage = req.user.hasPermission(workspace._id, "manageInventory");

    if (!isOwner && !canManage) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const usageQty = Math.max(Number(quantity || 0), 0);
    item.quantity = Math.max(item.quantity - usageQty, 0);
    await item.save();

    await InventoryEvent.create({
      workspace: workspace._id,
      item: item._id,
      type: "usage",
      quantity: usageQty,
      message: message || `Used ${usageQty} ${item.unit} of ${item.name}`,
      createdBy: req.user.id,
    });

    await maybeEmitLowStockAlert(item, workspace, req.user.id);

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restockInventory = async (req, res) => {
  try {
    const { quantity, workspaceId, message } = req.body;

    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Inventory item not found" });
    }

    const workspace = await Workspace.findById(workspaceId || item.workspace);
    if (!workspace || workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const restockQty = Math.max(Number(quantity || 0), 0);
    item.quantity += restockQty;
    item.lastRestockedAt = new Date();
    await item.save();

    await InventoryEvent.create({
      workspace: workspace._id,
      item: item._id,
      type: "restock",
      quantity: restockQty,
      message: message || `Restocked ${restockQty} ${item.unit} of ${item.name}`,
      createdBy: req.user.id,
    });

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInventoryAlerts = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const lowStockItems = await InventoryItem.find({
      workspace: workspaceId,
      isActive: true,
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] },
    }).sort({ quantity: 1 });

    const events = await InventoryEvent.find({ workspace: workspaceId, type: "alert" })
      .populate("item", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        lowStockItems,
        events,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
