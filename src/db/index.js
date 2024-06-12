import mongoose from "mongoose";

const DB_NAME = "dummy-bank";

const connectDB = async () => {
    try {
        const conf = await mongoose.connect(
            `${process.env.MONGO_URI}/${DB_NAME}`
        );
        console.log("MongoDB Connected :: ", conf.connection.host);
    } catch (error) {
        console.log("Error :: DB ::", error.message);
        process.exit(1);
    }
};

export default connectDB;
