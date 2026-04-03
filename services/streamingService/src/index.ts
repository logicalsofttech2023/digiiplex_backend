import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { connectPostgresDB } from "./config/db.js";
dotenv.config();
import { db, subscription } from "@digiiplex6112/db";
 

const app = express();
const PORT = Number(process.env.PORT) || 3005;

app.use(express.json());
await connectPostgresDB();



app.get("/", async (_req: Request, res: Response) => {
  await db.insert(subscription).values({ userId: "user1", plan: "premium" });
  res.json({ service: "Streaming Service running" });
});

app.get("/play", (_req: Request, res: Response) => {
  res.json({
    stream: "https://cdn.example.com/video/playlist.m3u8",
  });
});

app.get("/health", async (_req: Request, res: Response) => {
  res.json({ ok: true, service: "streaming-service" });
});

app.listen(PORT, () => {
  console.log(`Streaming Service running on ${PORT}`);
});
