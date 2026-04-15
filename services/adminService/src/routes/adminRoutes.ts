import express from "express";
import * as adminController from "../controllers/AdminController.js";
import upload from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import * as adminValidator from "../validators/adminValidator.js";

const router = express.Router();

router.post("/super-admins", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createSuperAdmin);
router.post("/super-admins/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginSuperAdmin);
router.post("/refreshToken", validate({ body: adminValidator.refreshTokenSchema }), adminController.refreshToken);
router.post("/logout", adminController.logout);

router.post("/admins", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createAdmin);
router.post("/admins/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginAdmin);

router.get("/admins/:id", validate({ body: adminValidator.getAdminByIdSchema }), adminController.getAdminById);
router.get("/admins", validate({ query: adminValidator.getAllAdminsSchema }), adminController.getAllAdmins);

router.post("/creators", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createCreator);
router.post("/creators/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginCreator);

router.get("/creators/:id", validate({ body: adminValidator.getAdminByIdSchema }), adminController.getCreatorById);
router.get("/creators", validate({ query: adminValidator.getAllAdminsSchema }), adminController.getAllCreators);

// ================= GENRES =================

router.post(
  "/genres",
  upload("genre").single("image"),
  adminController.createGenre,
);

router.get("/genres", adminController.getAllGenres);

router.get("/genres/:id", adminController.getGenreById);

router.patch(
  "/genres/:id",
  upload("genre").single("image"),
  adminController.updateGenre,
);

router.delete("/genres/:id", adminController.deleteGenre);

// ================= LANGUAGES =================

router.post(
  "/languages",
  upload("language").single("image"),
  adminController.createLanguage,
);

router.get("/languages", adminController.getAllLanguages);

router.get("/languages/:id", adminController.getLanguageById);

router.patch(
  "/languages/:id",
  upload("language").single("image"),
  adminController.updateLanguage,
);

router.delete("/languages/:id", adminController.deleteLanguage);

export default router;
