import express, { type Request, type Response } from "express";
import "dotenv/config";
import { PORT } from "./constants/constant.js";
import { GRPC_ADDRESS } from "./constants/constant.js";
import keyRoutes from "./routes/key.routes.js";
import { connectPostgresDB } from "./config/db.js";
import cors from "cors";
import { startKeyGrpcServer } from "./grpc/keyGrpcServer.js";
import { ensureActiveKey } from "./services/key.service.js";


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const bootstrap = async () => {
  try {
    await connectPostgresDB();
    const activeKey = await ensureActiveKey();
    console.log(`Active key ready: ${activeKey.kid}`);

    await startKeyGrpcServer(GRPC_ADDRESS);
    console.log(`Key Management gRPC running at ${GRPC_ADDRESS}`);
  } catch (error) {
    console.error("Failed to bootstrap Key Management service", error);
    process.exit(1);
  }
};

void bootstrap();

app.use(cors());


app.get("/", (_req: Request, res: Response) => {
  res.json({ service: "Key Management Service running" });
});

app.use("/keys", keyRoutes);

app.get("/health", (_req: Request, res: Response) => {
  try {
    res.json({ ok: true, service: "key-management-service" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ ok: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Key Management Service running at http://localhost:${PORT}`);
});
