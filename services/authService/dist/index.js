// index.ts
import express from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3001;
// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health check
app.get("/", (_req, res) => {
    res.json({ service: "Auth Service running" });
});
app.get("/health", async (_req, res) => {
    try {
        await db.execute(sql `SELECT 1`);
        res.json({ ok: true, service: "auth-service" });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: "Database connection failed" });
    }
});
// Routes
app.use("/auth", authRoutes);
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ status, message });
});
// Start server
app.listen(PORT, () => {
    console.log(`Auth Service running at http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map