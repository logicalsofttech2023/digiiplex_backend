import express from "express";
import * as uploadController from "../controllers/uploadController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Upload Lifecycle ──────────────────────────────────────
router.post("/media", authMiddleware, uploadController.createUpload);
router.post("/media/multipart/signed-url", authMiddleware, uploadController.getMultipartSignedUrl);
router.post("/media/multipart/complete", authMiddleware, uploadController.completeMultipartUpload);
router.post("/media/thumbnail", authMiddleware, uploadController.saveThumbnail);

// ── Fetch ─────────────────────────────────────────────────
router.get("/media", authMiddleware, uploadController.getAllUploads);
router.get("/media/:id", authMiddleware, uploadController.getUploadById);
router.get("/media/:uploadId/status/:assetRole", authMiddleware, uploadController.getProcessingStatus);

// ── Delete ────────────────────────────────────────────────
router.delete("/media", authMiddleware, uploadController.deleteUpload);


export default router;