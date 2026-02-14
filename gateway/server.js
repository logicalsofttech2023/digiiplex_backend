import express from "express";
import axios from "axios";

const app = express();

const services = {
  auth: "http://localhost:4001",
  user: "http://localhost:4002",
  video: "http://localhost:4003",
  subscription: "http://localhost:4004",
  payment: "http://localhost:4005",
  admin: "http://localhost:4006",
  analytics: "http://localhost:4007",
};

app.get("/health", (req, res) => {
  res.json({ status: "Gateway Running 🚀" });
});

app.get("/test-all", async (req, res) => {
  const results = {};

  for (const [name, url] of Object.entries(services)) {
    try {
      const response = await axios.get(`${url}/health`);
      results[name] = response.data;
    } catch (err) {
      results[name] = { error: "Service Down ❌" };
    }
  }

  res.json(results);
});

app.listen(4000, () => {
  console.log("Gateway running on 4000");
});
