import express from "express";
import "dotenv/config";
import { PORT } from "./constants/constant.js";
import { GRPC_ADDRESS } from "./constants/constant.js";
import keyRoutes from "./routes/key.routes.js";
import { connectPostgresDB } from "./config/db.js";
import cors from "cors";
import { startKeyGrpcServer } from "./grpc/keyGrpcServer.js";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
connectPostgresDB();
startKeyGrpcServer(GRPC_ADDRESS)
    .then(() => {
    console.log(`Key Management gRPC running at ${GRPC_ADDRESS}`);
})
    .catch((error) => {
    console.error("Failed to start Key Management gRPC server", error);
    process.exit(1);
});
app.use(cors());
app.get("/", (_req, res) => {
    res.json({ service: "Key Management Service running" });
});
app.use("/keys", keyRoutes);
app.get("/health", (_req, res) => {
    try {
        res.json({ ok: true, service: "key-management-service" });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ ok: false, error: message });
    }
});
app.listen(PORT, () => {
    console.log(`Key Management Service running at http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map