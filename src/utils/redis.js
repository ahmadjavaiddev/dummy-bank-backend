import Redis from "redis";

const redisClient = new Redis.createClient({
    url: process.env.REDIS_URI,
});

const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
    } catch (error) {
        console.log("Error while connecting to Redis ::", error);
    }
};

redisClient.on("error", (err) => {
    console.error("Redis error:", err);
});

redisClient.on("end", () => {
    console.log("Redis connection closed. Attempting to reconnect...");
    setTimeout(connectRedis, 1000); // Attempt to reconnect after 1 second
});

export { connectRedis, redisClient };
