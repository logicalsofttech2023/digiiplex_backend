import "dotenv/config";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = Number(process.env.REDIS_PORT || 6379);

export const connection = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

export const videoQueue = new Queue("video-processing", {
  connection,
});
