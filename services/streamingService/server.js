import express from "express";

const app = express();

const streamingService = {
  play: (req, res) => {
    res.json({
      stream: "https://cdn.example.com/video/playlist.m3u8"
    });
  }
};

app.get("/", (req, res) => {
  res.json({ service: "Streaming Service running" });
});

app.get("/play", streamingService.play);

app.listen(3005, () => {
  console.log("Streaming Service running on 3005");
});