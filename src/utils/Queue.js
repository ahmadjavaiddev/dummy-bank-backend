import { Queue } from "bullmq";
import { redisClient } from "./redis.js";

const emailQueue = new Queue("emailQueue", { redis: redisClient });

export { emailQueue };
