import express from "express";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { db } from "./config/db.js";
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 3001;
app.use(express.json());
app.get('/', (req, res) => {
    res.json({ service: "Auth Service running" });
});
app.get("/getCount", (req, res) => {
    res.json({ count: 0 });
});
app.get("/health", async (_req, res) => {
    await db.execute(sql `SELECT 1`);
    res.json({ ok: true, service: "auth-service" });
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map