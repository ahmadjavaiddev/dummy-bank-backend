import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User Id is required"],
        },
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        type: {
            type: String,
            enum: ["LOGIN", "TRANSACTION", "MPIN", "CARD", "PAYMENT"],
            required: [true, "Type is required"],
        },
        status: {
            type: String,
            enum: [
                "COMPLETED",
                "QUEUED",
                "FAILED",
                "RECEIVED",
                "CREATED",
                "FREEZE",
                "UNFREEZE",
                "REQUESTED",
            ],
            required: [true, "Status is required"],
        },
        message: {
            type: String,
            required: [true, "Message is required"],
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
