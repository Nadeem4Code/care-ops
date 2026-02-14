import express from "express";
import {
  createServiceType,
  getServiceTypes,
  updateServiceType,
  deleteServiceType,
} from "../controllers/serviceTypeController.js";
import { protect, isOwner } from "../middleware/auth.js";

const router = express.Router();

// Owner only
router.post("/", protect, isOwner, createServiceType);
router.put("/:id", protect, isOwner, updateServiceType);
router.delete("/:id", protect, isOwner, deleteServiceType);

// Public
router.get("/workspace/:workspaceId", getServiceTypes);

export default router;
