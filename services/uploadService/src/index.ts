import express from "express";
import "dotenv/config";
import type { Request, Response } from "express";
import { PORT } from "./constants/constant.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import { connectPostgresDB } from "./config/db.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import cors from "cors";
import { setBucketCors } from "./config/s3.js";
import { videos, db } from "@digiiplex6112/db";

const app = express();
app.use(express.json());
app.use(cors());

connectPostgresDB();
setBucketCors();

const getData = async () => {
  try {
    const video = await db.select().from(videos).limit(1);
      console.log(video);
  } catch (error) {
    console.log(error);
  }
};
getData();

app.get("/test", (req: Request, res: Response) => {
  res.json({ service: "upload Service running" });
});

app.use("/upload", uploadRoutes);

app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`upload Service running on1 ${PORT}`);
});
