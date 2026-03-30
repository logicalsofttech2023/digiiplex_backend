import { Worker } from "bullmq";
import IORedis from "ioredis";
import nodemailer from "nodemailer";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

console.log("🚀 Worker started...");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "luckydawar99@gmail.com",
    pass: "zbwt caqo bkqz rrsw",
  },
});

// optional but useful
transporter.verify()
  .then(() => console.log("✅ Mail server ready"))
  .catch((err: any) => console.error("❌ Mail server error:", err));

const worker = new Worker(
  "email-queue",
  async (job) => {
    console.log("📩 Job received:", job.data);

    const { to, subject, html } = job.data;

    try {
      const info = await transporter.sendMail({
        from: "luckydawar99@gmail.com",
        to,
        subject,
        html,
      });

      console.log("✅ Email sent:", info.messageId);
    } catch (err) {
      console.error("❌ Email failed:", err);
      throw err;
    }
  },
  { connection }
);

// BullMQ events
worker.on("completed", (job) => {
  console.log("🎉 Job completed:", job.id);
});

worker.on("failed", (job, err) => {
  console.error("❌ Job failed:", err.message);
});

worker.on("error", (err) => {
  console.error("🚨 Worker error:", err);
});