import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import { connectRedis } from "./utils/redis.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB()
    .then(async () => {
        await connectRedis();
        console.log("Redis Connected SuccessFully!");
    })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on PORT ${PORT}`);
        });
    })
    .catch((error) => console.log("Error :: DB ::", error.message));
