import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "Payment Service Running ✅" });
});

app.get("/payment-test", (req, res) => {
  res.json({ message: "Payment API Working 💰" });
});

app.listen(4005, () => {
  console.log("Payment Service on 4005");
});
