import express from "express";

const app = express();

const videoService = {
  list: (req, res) => {
    res.json({ videos: [] });
  }
};

app.get("/", (req, res) => {
  res.json({ service: "Video Service running" });
});

app.get("/videos", videoService.list);

app.listen(3004, () => {
  console.log("Video Service running on 3004");
});