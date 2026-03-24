import express from "express";
import { PORT } from "./constants/constant.js";
import { errorMiddleware } from "./middleware/errorMiddleware.js";
import connectDB from "./config/db.js";
const app = express();
app.use(express.json());
connectDB();
app.get("/", (req, res) => {
    res.json({ service: "Admin Service running" });
});
app.use(errorMiddleware);
app.listen(PORT, () => {
    console.log(`Admin Service running on ${PORT}`);
});
//# sourceMappingURL=index.js.map