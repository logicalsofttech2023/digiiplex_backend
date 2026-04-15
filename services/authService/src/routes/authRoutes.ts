import express from "express";
const router = express.Router();
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import * as userValidator from "../validators/userValidator.js";

// ===== AUTH =====
router.post("/otp", validate({ body: userValidator.generateOTPSchema }), authController.generateOTP);
router.post("/otp/verify", validate({ body: userValidator.verifyOTPSchema }), authController.verifyOTP);
router.post("/refresh", validate({ body: userValidator.refreshTokenSchema }), authController.refreshToken);
router.post("/logout", authController.logout);

// ===== PROFILES =====
router.post("/profiles", validate({ body: userValidator.createProfileSchema }), authMiddleware, authController.createProfile);
router.get("/profiles", authMiddleware, authController.getProfiles);

router.get("/genres", authController.getGenres);
router.get("/languages", authController.getLanguages);


export default router;
