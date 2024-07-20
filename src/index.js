import dotenv from "dotenv";
import { httpServer } from "./app.js";
import connectDB from "./db/index.js";
import { connectRedis } from "./utils/redis.js";
import { QueueManager } from "./managers/QueueManager.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const queueManager = new QueueManager();

connectDB()
    .then(async () => await connectRedis())
    .then(async () => await queueManager.connect())
    .then(() => {
        httpServer.listen(PORT, () => {
            console.info("⚙️  Server is running on port: ", PORT);
        });
    })
    .catch((error) => console.log("Error :: Init ::", error.message));
