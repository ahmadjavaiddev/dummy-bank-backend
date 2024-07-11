import dotenv from "dotenv";
import { httpServer } from "./app.js";
import connectDB from "./db/index.js";
import { connectRedis } from "./utils/redis.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
    .then(async () => {
        await connectRedis();
    })
    .then(() => {
        httpServer.listen(PORT, () => {
            console.info("⚙️  Server is running on port: ", PORT);
        });
    })
    .catch((error) => console.log("Error :: DB ::", error.message));
