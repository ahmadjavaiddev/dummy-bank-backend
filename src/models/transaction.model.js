import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: [true, "Amount is required"],
        },
        date: {
            type: Date,
        },
        description: {
            type: String,
        },
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "From is required"],
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "To is required"],
        },
        status: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED", "QUEUED"],
            default: "PENDING",
        },
        type: {
            type: String,
            enum: ["TRANSFER", "WITHDRAW", "DEPOSIT", "REQUEST"],
            default: "TRANSFER",
        },
    },
    { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
