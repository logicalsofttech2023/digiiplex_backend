import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { prisma } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3005;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "Streaming Service running" });
});

app.get("/play", (_req: Request, res: Response) => {
  res.json({
    stream: "https://cdn.example.com/video/playlist.m3u8",
  });
});

app.get("/health", async (_req: Request, res: Response) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, service: "streaming-service" });
});

app.listen(PORT, () => {
  console.log(`Streaming Service running on ${PORT}`);
});
