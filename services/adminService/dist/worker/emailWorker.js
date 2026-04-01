import { Worker } from "bullmq";
import { Redis } from "ioredis";
import nodemailer from "nodemailer";
const connection = new Redis(process.env.REDIS_URL || "redis://redis:6379", {
    maxRetriesPerRequest: null,
});
console.log("🚀 Worker started...");
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
// optional but useful
transporter.verify()
    .then(() => console.log("✅ Mail server ready"))
    .catch((err) => console.error("❌ Mail server error:", err));
const worker = new Worker("email-queue", async (job) => {
    console.log("📩 Job received:", job.data);
    const { to, subject, html } = job.data;
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject,
            html,
        });
        console.log("✅ Email sent:", info.messageId);
    }
    catch (err) {
        console.error("❌ Email failed:", err);
        throw err;
    }
}, { connection });
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
//# sourceMappingURL=emailWorker.js.map