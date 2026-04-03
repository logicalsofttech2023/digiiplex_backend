// index.ts
import express, { Request, Response, NextFunction } from "express";
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
app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "Auth Service running" });
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ok: true, service: "auth-service" });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Database connection failed" });
  }
});



// Routes
app.use("/auth", authRoutes);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ status, message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth Service running at http://localhost:${PORT}`);
});