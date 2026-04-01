import express from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3002;
app.use(express.json());
app.get("/", (_req, res) => {
    res.json({ service: "User Service running" });
});
app.get("/users", (_req, res) => {
    res.json({ users: [] });
});
app.get("/health", async (_req, res) => {
    await db.execute(sql `SELECT 1`);
    res.json({ ok: true, service: "user-service" });
});
app.listen(PORT, () => {
    console.log(`User Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map