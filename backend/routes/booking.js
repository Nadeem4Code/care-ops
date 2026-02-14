import express from "express";
import {
  createPublicBooking,
  getAvailableSlots,
  getBookings,
  getBooking,
  updateBookingStatus,
  rescheduleBooking,
  cancelBooking,
  getBookingStats,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";
import {
  belongsToWorkspace,
  checkPermission,
} from "../middleware/permissions.js";

const router = express.Router();

// Public routes
router.post("/public", createPublicBooking);
router.get("/available-slots", getAvailableSlots);

// Protected routes (staff with permissions)
router.get(
  "/workspace/:workspaceId",
  protect,
  belongsToWorkspace,
  checkPermission("manageBookings"),
  getBookings,
);

router.get(
  "/workspace/:workspaceId/stats",
  protect,
  belongsToWorkspace,
  getBookingStats,
);

router.get("/:id", protect, getBooking);

router.put(
  "/:id/status",
  protect,
  checkPermission("manageBookings"),
  updateBookingStatus,
);

router.put(
  "/:id/reschedule",
  protect,
  checkPermission("manageBookings"),
  rescheduleBooking,
);

router.delete(
  "/:id",
  protect,
  checkPermission("manageBookings"),
  cancelBooking,
);

export default router;
