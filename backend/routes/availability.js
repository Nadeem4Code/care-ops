import express from "express";
import {
  setAvailability,
  getAvailability,
  batchSetAvailability,
} from "../controllers/availabilityController.js";
import { protect, isOwner } from "../middleware/auth.js";

const router = express.Router();

// Owner only
router.post("/", protect, isOwner, setAvailability);
router.post("/batch", protect, isOwner, batchSetAvailability);

// Public
router.get("/workspace/:workspaceId", getAvailability);

export default router;
