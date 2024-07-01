import { Queue } from "bullmq";
import { redisClient } from "./redis.js";

const emailQueue = new Queue("emailQueue", {
    connection: redisClient,
});

export { emailQueue };
