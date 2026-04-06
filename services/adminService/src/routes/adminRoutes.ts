import express from "express";
import * as adminController from "../controllers/AdminController.js";
import upload from "../middleware/upload.js";

const router = express.Router();


// ================= ADMIN =================

// POST /admins
router.post("/admins", adminController.createAdmin);

// POST /admins/login
router.post("/admins/login", adminController.loginAdmin);

// GET /admins
router.get("/admins", adminController.getAllAdmins);

// GET /admins/:id
router.get("/admins/:id", adminController.getAdminById);

// PATCH /admins/:id
router.patch("/admins/:id", adminController.updateAdmin);

// DELETE /admins/:id
router.delete("/admins/:id", adminController.deleteAdmin);

// ================= CREATORS =================
// POST /creators
router.post("/creators", adminController.createCreator);

// POST /creators/login
router.post("/creators/login", adminController.loginCreator);

// GET /creators
router.get("/creators", adminController.getAllCreators);

// GET /creators/:id
router.get("/creators/:id", adminController.getCreatorById);

// PATCH /creators/:id
router.patch("/creators/:id", adminController.updateCreator);

// DELETE /creators/:id
router.delete("/creators/:id", adminController.deleteCreator);

// EMAIL VERIFY
router.get("/creators/verify-email", adminController.verifyEmail);

// ================= GENRES =================

// POST /genres
router.post(
  "/genres",
  upload("genre").single("image"),
  adminController.createGenre
);

// GET /genres
router.get("/genres", adminController.getAllGenres);

// GET /genres/:id
router.get("/genres/:id", adminController.getGenreById);

// PATCH /genres/:id
router.patch(
  "/genres/:id",
  upload("genre").single("image"),
  adminController.updateGenre
);

// DELETE /genres/:id
router.delete("/genres/:id", adminController.deleteGenre);


// ================= LANGUAGES =================

// POST /languages
router.post(
  "/languages",
  upload("language").single("image"),
  adminController.createLanguage
);

// GET /languages
router.get("/languages", adminController.getAllLanguages);

// GET /languages/:id
router.get("/languages/:id", adminController.getLanguageById);

// PATCH /languages/:id
router.patch(
  "/languages/:id",
  upload("language").single("image"),
  adminController.updateLanguage
);

// DELETE /languages/:id
router.delete("/languages/:id", adminController.deleteLanguage);



export default router;