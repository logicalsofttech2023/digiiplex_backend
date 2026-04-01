import express from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3003;
app.use(express.json());
app.get("/", (_req, res) => {
    res.json({ service: "Subscription Service running" });
});
app.get("/plans", (_req, res) => {
    res.json({ plans: ["basic", "premium"] });
});
app.get("/health", async (_req, res) => {
    await db.execute(sql `SELECT 1`);
    res.json({ ok: true, service: "subscription-service" });
});
app.listen(PORT, () => {
    console.log(`Subscription Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map