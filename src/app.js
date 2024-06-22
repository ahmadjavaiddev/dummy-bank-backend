import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./utils/logger.js";
import morgan from "morgan";

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

app.get("/health", (req, res) => {
    return res.status(201).json({
        message: "Server Is Running!",
        success: true,
    });
});

export default app;
