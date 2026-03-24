import express from "express";
import { PORT } from "./constants/constant.js";
import adminRouter from "./routes/adminRoutes.js";
const app = express();
app.get("/", (req, res) => {
    res.json({ service: "Admin Service running" });
});
app.use("/admin", adminRouter);
app.listen(PORT, () => {
    console.log(`Admin Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map