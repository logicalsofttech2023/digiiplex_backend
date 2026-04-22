import express from "express";
import * as adminController from "../controllers/AdminController.js";
import * as adminStreaming from "../controllers/AdminStreamingController.js";
import upload from "../middleware/upload.js";
import { validate } from "../middleware/validate.js";
import * as adminValidator from "../validators/adminValidator.js";
const router = express.Router();
// ================= AUTH =================
router.post("/super-admins", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createSuperAdmin);
router.post("/super-admins/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginSuperAdmin);
router.post("/refreshToken", validate({ body: adminValidator.refreshTokenSchema }), adminController.refreshToken);
router.post("/logout", adminController.logout);
// ================= ADMINS =================
router.post("/admins", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createAdmin);
router.post("/admins/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginAdmin);
router.patch("/admins/:id", validate({
    params: adminValidator.getAdminByIdSchema,
    body: adminValidator.updateAdminSchema,
}), adminController.updateAdmin);
router.delete("/admins/:id", validate({ params: adminValidator.getAdminByIdSchema }), adminController.deleteAdmin);
router.get("/admins/:id", validate({ params: adminValidator.getAdminByIdSchema }), adminController.getAdminById);
router.get("/admins", validate({ query: adminValidator.getAllAdminsSchema }), adminController.getAllAdmins);
// ================= CREATORS =================
router.post("/creators", validate({ body: adminValidator.createSuperAdminSchema }), adminController.createCreator);
router.post("/creators/login", validate({ body: adminValidator.loginSuperAdminSchema }), adminController.loginCreator);
router.get("/creators/:id", validate({ params: adminValidator.getAdminByIdSchema }), adminController.getCreatorById);
router.get("/creators", validate({ query: adminValidator.getAllAdminsSchema }), adminController.getAllCreators);
router.patch("/creators/:id", validate({
    params: adminValidator.getAdminByIdSchema,
    body: adminValidator.updateAdminSchema,
}), adminController.updateCreator);
router.delete("/creators/:id", validate({ params: adminValidator.getAdminByIdSchema }), adminController.deleteCreator);
// ================= USERS =================
router.get("/users", validate({ query: adminValidator.getAllUsersSchema }), adminController.getAllUsers);
router.get("/users/:id", validate({ params: adminValidator.getAdminByIdSchema }), adminController.getUserById);
// ================= GENRES =================
router.post("/genres", upload("genre").single("image"), adminController.createGenre);
router.get("/genres", adminController.getAllGenres);
router.get("/genres/:id", adminController.getGenreById);
router.patch("/genres/:id", upload("genre").single("image"), adminController.updateGenre);
router.delete("/genres/:id", adminController.deleteGenre);
// ================= LANGUAGES =================
router.post("/languages", upload("language").single("image"), adminController.createLanguage);
router.get("/languages", adminController.getAllLanguages);
router.get("/languages/:id", adminController.getLanguageById);
router.patch("/languages/:id", upload("language").single("image"), adminController.updateLanguage);
router.delete("/languages/:id", adminController.deleteLanguage);
// ================= STREAMING / CONTENT APPROVAL =================
router.get("/streaming/pending", adminStreaming.getPendingVideos);
router.get("/streaming/videos", adminStreaming.getAllVideosAdmin);
router.get("/streaming/videos/:videoId", adminStreaming.getVideoDetailAdmin);
router.patch("/streaming/videos/:videoId/approve", adminStreaming.approveVideo);
router.patch("/streaming/videos/:videoId/reject", adminStreaming.rejectVideo);
router.patch("/streaming/videos/:videoId/archive", adminStreaming.archiveVideo);
router.patch("/streaming/videos/:videoId/publish", adminStreaming.publishVideo);
router.patch("/streaming/videos/:videoId", adminStreaming.updateVideoAdmin);
router.delete("/streaming/videos/:videoId", adminStreaming.deleteVideoAdmin);
export default router;
//# sourceMappingURL=adminRoutes.js.map