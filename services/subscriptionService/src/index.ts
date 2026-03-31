import express from "express";
import type { Request, Response } from "express";
import dotenv from "dotenv";
import { prisma } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "Subscription Service running" });
});

app.get("/plans", (_req: Request, res: Response) => {
  res.json({ plans: ["basic", "premium"] });
});

app.get("/health", async (_req: Request, res: Response) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, service: "subscription-service" });
});

app.listen(PORT, () => {
  console.log(`Subscription Service running on ${PORT}`);
});
