import Redis from "ioredis";

const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null, // Disable retries for blocking commands
    // url: process.env.REDIS_URI,
});

const connectRedis = async () => {
    try {
        // Check if the client is already connecting or connected
        if (
            redisClient.status === "connecting" ||
            redisClient.status === "connected"
        ) {
            console.log("Redis client is already connecting/connected.");
            return redisClient;
        }

        // If not already connecting or connected, initiate connection
        await redisClient.connect();
        console.log("Connected to Redis!");
        return redisClient;
    } catch (error) {
        console.error("Error while connecting to Redis:", error);
    }
};

redisClient.on("connect", () => {
    console.error("Redis Connected");
});

// Event listeners for Redis client errors and connection closed
redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

redisClient.on("end", () => {
    console.log("Redis connection closed. Attempting to reconnect...");
    // setTimeout(connectRedis, 1000); // Attempt to reconnect after 1 second
});

// (async () => {
//     try {
//         await connectRedis();
//         console.log("Redis Connected!");
//     } catch (error) {
//         console.log("Error Here ::", error);
//     }
// })();
export { connectRedis, redisClient };
