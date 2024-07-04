import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URI, {
    maxRetriesPerRequest: null,
});

const connectRedis = async () => {
    try {
        // Check if the client is already connecting or connected
        if (
            redisClient.status === "connecting" ||
            redisClient.status === "connected"
        ) {
            console.log("Redis client is already connecting/connected.");
            return;
        }

        // If not already connecting or connected, initiate connection
        await redisClient.connect();
        console.log("Connected to Redis!");
        return;
    } catch (error) {
        console.error("Error while connecting to Redis:", error);
    }
};

redisClient.on("connect", () => {
    console.log("Redis Connected");
});

// Event listeners for Redis client errors and connection closed
redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

redisClient.on("end", () => {
    console.log("Redis connection closed. Attempting to reconnect...");
    setTimeout(connectRedis, 1000); // Attempt to reconnect after 1 second
});

export { connectRedis, redisClient };
