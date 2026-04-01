import express from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3005;
app.use(express.json());
app.get("/", (_req, res) => {
    res.json({ service: "Streaming Service running" });
});
app.get("/play", (_req, res) => {
    res.json({
        stream: "https://cdn.example.com/video/playlist.m3u8",
    });
});
app.get("/health", async (_req, res) => {
    await db.execute(sql `SELECT 1`);
    res.json({ ok: true, service: "streaming-service" });
});
app.listen(PORT, () => {
    console.log(`Streaming Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map