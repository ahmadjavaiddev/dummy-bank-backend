import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger.js";
import morgan from "morgan";
import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { redisClient } from "./utils/redis.js";

const app = express();
app.use(cookieParser());
app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const morganFormat = ":method :url :status :response-time ms";
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => {
                const logObject = {
                    method: message.split(" ")[0],
                    url: message.split(" ")[1],
                    status: message.split(" ")[2],
                    responseTime: message.split(" ")[3],
                };
                logger.info(JSON.stringify(logObject));
            },
        },
    })
);

import userRouter from "./routes/user.route.js";
import transactionRouter from "./routes/transaction.route.js";
import cardRouter from "./routes/card.route.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/card", cardRouter);

app.get("/health", async (req, res) => {
    try {
        // await redisClient.set("user:1", "new-user");
        // const getUser = await redisClient.get("user:1");

        return res.status(201).json({
            message: "Server Is Running!",
            success: true,
        });
    } catch (error) {
        console.log("Error In Health Route ::", error);
    }
});

app.get("/empty-logs", async (req, res) => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const filePath = join(__dirname, "..", "app.log");

        fs.unlinkSync(filePath);

        return res.status(201).json({
            message: "Logs Removed SuccessFully!",
            success: true,
        });
    } catch (error) {
        console.log("Error while removing the logs ::", error.message);
    }
});

export default app;
