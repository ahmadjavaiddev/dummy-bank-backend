import { QueueManager } from "../managers/QueueManager.js";

const queueManager = new QueueManager();

async function emailQueue(userName, email, type, token) {
    try {
        // await queueManager.connect();
        const data = {
            userName: userName,
            email: email,
            type: type,
            token: token,
        };

        await queueManager.sendToQueue("email_queue", data);
    } catch (error) {
        console.error("Failed to send email ::", error);
    }
}

async function transactionQueue(userId, transactionId) {
    try {
        // await queueManager.connect();
        const data = {
            userId: userId,
            transactionId: transactionId,
        };

        await queueManager.sendToQueue("transaction_queue", data);
    } catch (error) {
        console.error("Failed to send transaction ::", error);
    }
}

async function notificationQueue(userId, type, message) {
    try {
        // await queueManager.connect();
        const data = {
            userId: userId,
            type: type,
            message: message,
        };

        await queueManager.sendToQueue("notification_queue", data);
    } catch (error) {
        console.error("Failed to send notification:", error);
    }
}

export { emailQueue, transactionQueue, notificationQueue };
