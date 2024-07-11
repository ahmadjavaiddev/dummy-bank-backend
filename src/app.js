import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger.js";
import morgan from "morgan";
import { createServer } from "http";
import { initializeSocketIO } from "./socket/index.js";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    pingTimeout: 60000,
    cors: {
        origin: "*",
        credentials: true,
    },
});

app.set("io", io); // using set method to mount the `io` instance on the app to avoid usage of `global`

app.use(cookieParser());
app.use(
    cors({
        origin: ["http://localhost:5173", "https://dummy-bank-lac.vercel.app"], // Replace with your actual frontend URL
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
initializeSocketIO(io);

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
import notificationRouter from "./routes/notification.route.js";
import { errorHandler } from "./middlewares/error.middleware.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/transactions", transactionRouter);
app.use("/api/v1/card", cardRouter);
app.use("/api/v1/notifications", notificationRouter);

app.get("/health", async (req, res) => {
    try {
        return res.status(201).json({
            message: "Server Is Running!",
            success: true,
        });
    } catch (error) {
        console.log("Error In Health Route ::", error);
    }
});

app.use(errorHandler);

export { httpServer };
