import Redis from "ioredis";

const redisConfig = {
    host: process.env.APP_REDIS_HOST,
    port: process.env.APP_REDIS_PORT,
    password: process.env.APP_REDIS_PASSWORD,
    maxRetriesPerRequest: null,
};

const redisClient = new Redis(redisConfig);

const connectRedis = async () => {
    try {
        // Check if the client is already connecting or connected
        if (
            redisClient.status === "ready" ||
            redisClient.status === "connected" ||
            redisClient.status === "connect" ||
            redisClient.status === "connecting"
        ) {
            console.log("Redis client is already connecting/connected.");
            return;
        }

        // If not already connecting or connected, initiate connection
        await redisClient.connect();
        return;
    } catch (error) {
        console.error("Error while connecting to Redis:", error);
    }
};

// Event listeners for Redis client
redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

redisClient.on("end", () => {
    console.log("Redis connection closed. Attempting to reconnect...");
    setTimeout(connectRedis, 1000); // Attempt to reconnect after 1 second
});

export { connectRedis, redisClient, redisConfig };
