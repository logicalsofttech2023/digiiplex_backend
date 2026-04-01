import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3004;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "Video Service running" });
});

app.get("/videos", (_req: Request, res: Response) => {
  res.json({ videos: [] });
});

app.get("/health", async (_req: Request, res: Response) => {
  await db.execute(sql`SELECT 1`);
  res.json({ ok: true, service: "video-service" });
});

app.listen(PORT, () => {
  console.log(`Video Service running on ${PORT}`);
});
