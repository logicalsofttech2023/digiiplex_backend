import express from "express"

import upload from "../middleware/upload.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import {
  sendOtp,
  verifyOtp,
  createProfileWithDetails,
  getProfiles,
  getProfile,
  selectLanguages,
  selectGenres,
  updateProfile,
  deleteProfile,
  getUser,
} from "../controllers/authController.js";

const router = express.Router();

// Public routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

// Protected routes (require authentication)
router.use(authMiddleware);

// Profile routes
router.post("/create-profile",  upload("profile").single("profileImg"), createProfileWithDetails);

router.get("/profiles", getProfiles);
router.get("/profile/:profileId", getProfile);
router.put("/profile/:profileId", upload("profile").single("profileImg"), updateProfile);
router.delete("/profile/:profileId", deleteProfile);

// Language & Genre routes
router.post("/select-languages", selectLanguages);
router.post("/select-genres", selectGenres);

// User routes
router.get("/me", getUser);

export default router;