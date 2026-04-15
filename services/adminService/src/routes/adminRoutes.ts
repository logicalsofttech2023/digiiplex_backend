import express from "express";
import * as adminController from "../controllers/AdminController.js";
import upload from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import { createSuperAdminSchema } from "../validators/adminValidator.js";

const router = express.Router();

router.post("/super-admins", validate({ body: createSuperAdminSchema }) adminController.createSuperAdmin);
router.post("/super-admins/login", adminController.loginSuperAdmin);

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
