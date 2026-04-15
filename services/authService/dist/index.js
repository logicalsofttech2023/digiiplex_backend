// index.ts
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
// import { db } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { PORT } from "./constants/constant.js";
import { connectPostgresDB } from "@digiiplex6112/db";
dotenv.config();
const app = express();
const port = PORT || 3001;
// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
connectPostgresDB();
// Health check
app.get("/", (_req, res) => {
    res.json({ service: "Auth Service running" });
});
app.get("/health", async (_req, res) => {
    try {
        res.json({ ok: true, service: "auth-service" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: "Database connection failed" });
    }
});
// Routes
app.use("/auth", authRoutes);
app.use(errorMiddleware);
// Start server
app.listen(port, () => {
    console.log(`Auth Service running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map