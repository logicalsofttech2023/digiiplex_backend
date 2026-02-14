import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Auth Service Running ✅" });
});

app.get("/login-test", (req, res) => {
  res.json({ message: "Login API Working 🔐" });
});

app.listen(4001, () => {
  console.log("Auth Service on 4001");
});
