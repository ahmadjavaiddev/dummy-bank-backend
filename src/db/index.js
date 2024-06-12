import mongoose from "mongoose";
import logger from "../utils/logger.js";

const DB_NAME = "dummy-bank";

const connectDB = async () => {
    try {
        const conf = await mongoose.connect(
            `${process.env.MONGO_URI}/${DB_NAME}`
        );
        logger.info("MongoDB Connected :: ", conf.connection.host);
    } catch (error) {
        console.log("Error :: DB ::", error.message);
        process.exit(1);
    }
};

export default connectDB;
