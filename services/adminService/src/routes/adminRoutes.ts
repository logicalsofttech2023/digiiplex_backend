import express from "express";
import * as adminController  from "../controllers/AdminController.js";
const router = express.Router();

router.post("/create", adminController.createAdmin);
router.post("/login", adminController.loginAdmin);

router.post("/creator/create", adminController.createCreator);
router.post("/creator/login", adminController.loginCreator);

export default router;