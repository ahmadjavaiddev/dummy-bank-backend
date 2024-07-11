import { redisClient } from "./redis.js";

const emailQueue = async (
    name,
    { userName, email, type, subject, verificationCode }
) => {
    try {
        const data = {
            userName: userName,
            email: email,
            type: type,
            subject: subject,
            verificationCode: verificationCode,
        };
        const jobId = await redisClient.rpush(
            "queue:e:emails",
            JSON.stringify(data)
        );

        return jobId;
    } catch (error) {
        console.log("Error while adding transaction in queue ::", error);
    }
};

const transactionQueue = async (transactionId) => {
    try {
        const data = {
            transactionId: transactionId,
        };
        const jobId = await redisClient.rpush(
            "queue:t:transactions",
            JSON.stringify(data)
        );
        return jobId;
    } catch (error) {
        console.log("Error while adding transaction in queue ::", error);
    }
};

export { emailQueue, transactionQueue };
