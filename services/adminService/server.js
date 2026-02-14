import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Admin Service Running ✅" });
});

app.get("/dashboard-test", (req, res) => {
  res.json({ message: "Admin Dashboard API Working 🛠️" });
});

app.listen(4006, () => {
  console.log("Admin Service on 4006");
});
