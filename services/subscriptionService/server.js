import express from "express";

const app = express();

const subscriptionService = {
  plans: (req, res) => {
    res.json({ plans: ["basic", "premium"] });
  }
};

app.get("/", (req, res) => {
  res.json({ service: "Subscription Service running" });
});

app.get("/plans", subscriptionService.plans);

app.listen(3003, () => {
  console.log("Subscription Service running on 3003");
});