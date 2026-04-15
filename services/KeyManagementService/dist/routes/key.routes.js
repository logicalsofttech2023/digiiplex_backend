import express from "express";
import { rotateKey, publicKeys, activeKey, } from "../controllers/key.controller.js";
const router = express.Router();
router.get("/public", publicKeys);
router.get("/active", activeKey); // internal
router.post("/rotate", rotateKey);
export default router;
//# sourceMappingURL=key.routes.js.map