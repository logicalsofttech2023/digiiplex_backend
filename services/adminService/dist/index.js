import express from "express";
import { PORT } from "./constants/constant.js";
import adminRouter from "./routes/adminRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
const app = express();
app.use(express.json());
// connectDB();
// connectPostgresDB();
app.get("/", (req, res) => {
    res.json({ service: "Admin Service running" });
});
app.use("/admin", adminRouter);
app.use(errorMiddleware);
app.listen(PORT, () => {
    console.log(`Admin Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map