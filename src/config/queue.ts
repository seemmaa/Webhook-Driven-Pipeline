import { Queue } from "bullmq";

export const jobQueue = new Queue("jobs", {
  connection: {
    // Fallback to '127.0.0.1' if the env variable is missing
    host: process.env.REDIS_HOST || "127.0.0.1", 
    // Fallback to 6379 if the env variable is missing or NaN
    port: Number(process.env.REDIS_PORT) || 6379,
  },
});