import express from "express";
import { protect, isOwner } from "../middleware/auth.js";
import {
  getGoogleStatus,
  handleGoogleCallback,
  startGoogleAuth,
} from "../controllers/googleController.js";

const router = express.Router();

router.get("/auth", protect, isOwner, startGoogleAuth);
router.get("/callback", handleGoogleCallback);
router.get("/status/:workspaceId", protect, isOwner, getGoogleStatus);

export default router;
