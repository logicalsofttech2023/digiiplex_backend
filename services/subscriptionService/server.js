import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Subscription Service Running ✅" });
});

app.get("/plans-test", (req, res) => {
  res.json({ message: "Plans API Working 💳" });
});

app.listen(4004, () => {
  console.log("Subscription Service on 4004");
});
