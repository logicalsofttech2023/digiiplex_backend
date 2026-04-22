import express from "express";
import dotenv from "dotenv";
import { connectPostgresDB } from "./config/db.js";
dotenv.config();
import streamingRoutes from "./routes/streamRoutes.js";
const app = express();
const PORT = Number(process.env.PORT) || 3005;
app.use(express.json());
await connectPostgresDB();
app.get("/", async (_req, res) => {
    res.json({ service: "Streaming Service running" });
});
app.use("/streaming", streamingRoutes);
app.get("/health", async (_req, res) => {
    res.json({ ok: true, service: "streaming-service" });
});
app.listen(PORT, () => {
    console.log(`Streaming Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map