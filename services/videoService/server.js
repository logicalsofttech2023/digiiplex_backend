import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Video Service Running ✅" });
});

app.get("/videos-test", (req, res) => {
  res.json({ message: "Video API Working 🎬" });
});

app.listen(4003, () => {
  console.log("Video Service on 4003");
});
