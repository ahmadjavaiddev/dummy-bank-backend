import amqp from "amqplib";

class QueueManager {
    constructor() {
        if (QueueManager.instance) {
            return QueueManager.instance;
        }

        this.rabbitmqUrl = process.env.RABBITMQ_URI;
        this.connection = null;
        this.channel = null;
        this.queues = [
            "email_queue",
            "transaction_queue",
            "notification_queue",
        ];

        QueueManager.instance = this;
    }

    async connect() {
        try {
            if (!this.connection) {
                this.connection = await amqp.connect(this.rabbitmqUrl);
                this.channel = await this.connection.createChannel();

                // Assert all queues
                for (const queue of this.queues) {
                    await this.channel.assertQueue(queue, { durable: true });
                    console.log(`Queue ${queue} is ready`);
                }

                console.log("Connected to RabbitMQ");
            }
        } catch (error) {
            console.error("Error connecting to RabbitMQ:", error);
            throw error;
        }
    }

    async sendToQueue(queueName, message) {
        if (!this.channel) {
            throw new Error("Channel is not initialized");
        }
        this.channel.sendToQueue(
            queueName,
            Buffer.from(JSON.stringify(message)),
            {
                persistent: true,
            }
        );
        console.log(`Sent message to ${queueName}: ${message}`);
    }

    async close() {
        if (this.connection) {
            await this.connection.close();
            console.log("Connection closed");
        }
    }
}

export { QueueManager };
