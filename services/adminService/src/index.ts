import express from "express";
import type { Request, Response } from "express";
import { PORT } from "./constants/constant.js";
import adminRouter from "./routes/adminRoutes.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
// import { connectDB, connectPostgresDB } from "./config/db.js";
import cors from "cors";

const app = express();
app.use(express.json());

// connectDB();
// connectPostgresDB();


app.get("/", (req: Request, res: Response) => {
  res.json({ service: "Admin Service running" });
});

app.use("/admin", adminRouter);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`Admin Service running on ${PORT}`);
});
