import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "User Service Running ✅" });
});

app.get("/profile-test", (req, res) => {
  res.json({ message: "Profile API Working 👤" });
});

app.listen(4002, () => {
  console.log("User Service on 4002");
});
