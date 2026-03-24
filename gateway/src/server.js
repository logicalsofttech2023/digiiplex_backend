import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import morgan from "morgan";

const app = express();

app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "Gateway Running 🚀" });
});

app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
  }),
);

app.listen(3000, () => {
  console.log("Gateway running on 3000");
});
