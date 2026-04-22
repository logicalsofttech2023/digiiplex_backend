import express from "express";
const router = express.Router();
import * as authController from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import * as userValidator from "../validators/userValidator.js";

// ===== AUTH =====
router.post("/otp", validate({ body: userValidator.generateOTPSchema }), authController.generateOTP);
router.post("/otp/verify", validate({ body: userValidator.verifyOTPSchema }), authController.verifyOTP);
router.post("/otp/resend", validate({ body: userValidator.generateOTPSchema }), authController.resendOTP);
router.post("/refresh", validate({ body: userValidator.refreshTokenSchema }), authController.refreshToken);
router.post("/logout", authController.logout);

// ===== PROFILES =====
router.post("/profiles", validate({ body: userValidator.createProfileSchema }), authMiddleware, authController.createProfile);
router.get("/profiles", authMiddleware, authController.getProfiles);

router.get("/genres", authController.getGenres);
router.get("/languages", authController.getLanguages);

// ===== FAQS =====

router.get("/faqs", authController.getFaqs);
router.post("/faqs", authController.createFaq);
router.put("/faqs/:id", authController.updateFaq);
router.delete("/faqs/:id", authController.deleteFaq);

// ===== ABOUT US =====

router.get("/aboutus", authController.getAboutUs);
router.post("/aboutus", authController.createAboutUs);
router.put("/aboutus/:id", authController.updateAboutUs);
router.delete("/aboutus/:id", authController.deleteAboutUs);

// ===== PRIVACY POLICY =====

router.get("/privacypolicy", authController.getPrivacyPolicy);
router.post("/privacypolicy", authController.createPrivacyPolicy);
router.put("/privacypolicy/:id", authController.updatePrivacyPolicy);
router.delete("/privacypolicy/:id", authController.deletePrivacyPolicy);

// ===== TERMS & CONDITIONS =====

router.get("/termsconditions", authController.getTermsConditions);
router.post("/termsconditions", authController.createTermsConditions);
router.put("/termsconditions/:id", authController.updateTermsConditions);
router.delete("/termsconditions/:id", authController.deleteTermsConditions);



export default router;
