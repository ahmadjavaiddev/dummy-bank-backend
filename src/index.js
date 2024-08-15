import dotenv from "dotenv";
import { httpServer } from "./app.js";
import connectDB from "./db/index.js";
import { connectRedis } from "./utils/redis.js";
import { QueueManager } from "./managers/QueueManager.js";
// import os from "os";
// import cluster from "cluster";

// const numCPUs = os.cpus().length;

// if (cluster.isPrimary) {
//     console.log(`Master ${process.pid} is running`);
//     console.log("CPUS are ::", numCPUs);

//     // Fork workers.
//     for (let i = 0; i < numCPUs; i++) {
//         cluster.fork();
//     }

//     // Listen for dying workers
//     cluster.on("listening", (worker) => {
//         console.log(`Worker ${worker.process.pid} running`);
//     });

//     cluster.on("exit", (worker, code, signal) => {
//         console.log(`Worker ${worker.process.pid} died`);
//         console.log("Starting a new worker");
//         cluster.fork(); // Restart the worker
//     });
// } else {
dotenv.config();

const PORT = process.env.PORT || 5000;

const queueManager = new QueueManager();

connectDB()
    .then(async () => await connectRedis())
    .then(async () => await queueManager.connect())
    .then(() => {
        httpServer.listen(PORT, () => {
            console.info("⚙️  Server is running on port: ", PORT);
        });
    })
    .catch((error) => console.log("Error :: Init ::", error.message));
// }
