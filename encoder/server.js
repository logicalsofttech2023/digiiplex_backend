import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Encoder Service Running ✅" });
});

app.get("/encode-test", (req, res) => {
  res.json({ message: "Encoding Pipeline Ready 🎥" });
});

app.listen(4010, () => {
  console.log("Encoder Service on 4010");
});
