import express from "express";
import * as adminController from "../controllers/AdminController.js";
import upload from "../middleware/upload.js";
const router = express.Router();
// admin
router.post("/create", adminController.createAdmin);
router.post("/login", adminController.loginAdmin);
router.post("/createGenre", upload("genre").single("image"), adminController.createGenre);
router.get("/getAllGenres", adminController.getAllGenres);
router.patch("/updateGenre/:id", upload("genre").single("image"), adminController.updateGenre);
router.delete("/deleteGenre/:id", adminController.deleteGenre);
router.post("/createLanguage", upload("language").single("image"), adminController.createLanguage);
router.get("/getAllLanguages", adminController.getAllLanguages);
router.patch("/updateLanguage/:id", upload("language").single("image"), adminController.updateLanguage);
router.delete("/deleteLanguage/:id", adminController.deleteLanguage);
router.get("/getAllCreator", adminController.getAllCreator);
router.post("/creator/create", adminController.createCreator);
router.put("/creator/update/:id", adminController.updateCreator);
router.delete("/creator/delete/:id", adminController.deleteCreator);
router.post("/creator/login", adminController.loginCreator);
router.get("/creator/verifyEmail", adminController.verifyEmail);
export default router;
//# sourceMappingURL=adminRoutes.js.map