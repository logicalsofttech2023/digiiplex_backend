import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Analytics Service Running ✅" });
});

app.get("/stats-test", (req, res) => {
  res.json({ message: "Analytics API Working 📊" });
});

app.listen(4007, () => {
  console.log("Analytics Service on 4007");
});
