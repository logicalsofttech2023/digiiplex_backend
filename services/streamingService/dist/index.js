import express from "express";
import dotenv from "dotenv";
import { connectPostgresDB } from "./config/db.js";
dotenv.config();
import { db, test } from "@digiiplex6112/db";
const app = express();
const PORT = Number(process.env.PORT) || 3005;
app.use(express.json());
await connectPostgresDB();
app.get("/", async (_req, res) => {
    await db.insert(test).values({ name: "Suraj" });
    res.json({ service: "Streaming Service running" });
});
app.get("/play", (_req, res) => {
    res.json({
        stream: "https://cdn.example.com/video/playlist.m3u8",
    });
});
app.get("/health", async (_req, res) => {
    res.json({ ok: true, service: "streaming-service" });
});
app.listen(PORT, () => {
    console.log(`Streaming Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map