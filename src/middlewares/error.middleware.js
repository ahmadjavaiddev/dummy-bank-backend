import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    let error = err;

    if (!(error instanceof ApiError)) {
        // assign an appropriate status code
        const statusCode =
            error.statusCode || error instanceof mongoose.Error ? 400 : 500;

        // set a message from native Error instance or a custom one
        const message = error.message || "Something went wrong";
        error = new ApiError(
            statusCode,
            message,
            error?.errors || [],
            err.stack
        );
    }

    // Now we are sure that the `error` variable will be an instance of ApiError class
    const response = {
        ...error,
        message: error.message,
        ...(process.env.NODE_ENV === "development"
            ? { stack: error.stack }
            : {}), // Error stack traces should be visible in development for debugging
    };

    console.error(`${error.message}`);

    // Send error response
    return res.status(error.statusCode).json(response);
};

export { errorHandler };
