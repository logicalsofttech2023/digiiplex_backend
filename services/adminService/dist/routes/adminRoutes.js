import express from "express";
import * as adminController from "../controllers/AdminController.js";
const router = express.Router();
router.post("/create", adminController.createAdmin);
router.post("/login", adminController.loginAdmin);
export default router;
//# sourceMappingURL=adminRoutes.js.map