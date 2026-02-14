import express from "express";
import {
  createInventoryItem,
  getInventoryAlerts,
  getInventoryItems,
  recordInventoryUsage,
  restockInventory,
  updateInventoryItem,
} from "../controllers/inventoryController.js";
import { protect, isOwner } from "../middleware/auth.js";
import { belongsToWorkspace, checkPermission } from "../middleware/permissions.js";

const router = express.Router();

router.post("/", protect, isOwner, createInventoryItem);
router.put("/:id", protect, isOwner, updateInventoryItem);
router.post("/:id/usage", protect, checkPermission("manageInventory"), recordInventoryUsage);
router.post("/:id/restock", protect, isOwner, restockInventory);

router.get(
  "/workspace/:workspaceId",
  protect,
  belongsToWorkspace,
  checkPermission("viewInventory"),
  getInventoryItems,
);

router.get(
  "/workspace/:workspaceId/alerts",
  protect,
  belongsToWorkspace,
  checkPermission("viewInventory"),
  getInventoryAlerts,
);

export default router;
