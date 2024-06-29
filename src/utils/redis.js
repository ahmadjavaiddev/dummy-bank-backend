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

export { connectRedis, redisClient };
