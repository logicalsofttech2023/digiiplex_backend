import express from "express";
import * as adminController  from "../controllers/AdminController.js";
import { upload } from "../middleware/upload.js";
const router = express.Router();


// admin
router.post("/create", adminController.createAdmin);
router.post("/login", adminController.loginAdmin);


// Genre routes
router.post("/createGenre/:folder", upload.single("image"), adminController.createGenre);
router.patch("/updateGenre/:folder", upload.single("image"), adminController.updateGenre);
router.delete("/deleteGenre/:folder", adminController.deleteGenre);
router.get("/getAllGenres", adminController.getAllGenres);


// Genre routes
router.post("/createLanguage/:folder", upload.single("image"), adminController.createLanguage);
router.patch("/updateLanguage/:folder", upload.single("image"), adminController.updateLanguage);
router.delete("/deleteLanguage/:folder", adminController.deleteLanguage);
router.get("/getAllLanguages", adminController.getAllLanguages);


// Creator routes
router.get("/getAllCreator", adminController.getAllCreator);
router.post("/creator/create", adminController.createCreator);
router.post("/creator/login", adminController.loginCreator);
router.get("/creator/verifyEmail", adminController.verifyEmail);



export default router;