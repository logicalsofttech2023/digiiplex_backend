import express from 'express';
import * as uploadController from "../controllers/uploadController.js";
const router = express.Router();
router.post("/createMovie", uploadController.createMovieUpload);
router.post("/getMultipartSignedUrl", uploadController.getMultipartSignedUrl);
router.post("/completeMultipartUpload", uploadController.completeMultipartUpload);
router.post("/saveThumbnail", uploadController.saveThumbnail);
router.get("/status/:movieId/:assetType", uploadController.getVideoProcessingStatus);
router.get("/getAllMovies", uploadController.getAllMovies);
router.get("/getMovieById/:id", uploadController.getMovieById);
router.delete("/deleteMovie", uploadController.deleteMovie);
export default router;
//# sourceMappingURL=uploadRoutes.js.map