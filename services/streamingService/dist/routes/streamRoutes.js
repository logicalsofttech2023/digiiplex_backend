import express from "express";
const router = express.Router();
import * as streController from "../controllers/streamController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
router.get("/videos", authMiddleware, streController.getPublishedVideos);
router.get("/videos/:videoId", authMiddleware, streController.getVideoDetail);
router.post("/videos/:id/play", authMiddleware, streController.getPlayUrl);
router.post("/videos/:id/progress", authMiddleware, streController.saveWatchProgress);
router.post("/session/end", authMiddleware, streController.endStreamingSession);
router.post("/history", authMiddleware, streController.getWatchHistory);
export default router;
//# sourceMappingURL=streamRoutes.js.map