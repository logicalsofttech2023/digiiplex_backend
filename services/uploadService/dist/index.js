import express from "express";
import "dotenv/config";
import { PORT } from "./constants/constant.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { connectPostgresDB } from "./config/db.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import cors from 'cors';
import { setBucketCors } from "./config/s3.js";
const app = express();
app.use(express.json());
app.use(cors());
connectPostgresDB();
setBucketCors();
app.get("/test", (req, res) => {
    res.json({ service: "upload Service running" });
});
app.use("/upload", uploadRoutes);
app.use(errorMiddleware);
app.listen(PORT, () => {
    console.log(`upload Service running on1 ${PORT}`);
});
//# sourceMappingURL=index.js.map