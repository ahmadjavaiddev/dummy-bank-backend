import mongoose from "mongoose";
import { TransactionStatusEnum, TransactionTypeEnum } from "../constants.js";

const transactionSchema = new mongoose.Schema(
    {
        amount: {
            type: Number,
            required: [true, "Amount is required"],
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
            enum: TransactionStatusEnum,
            default: TransactionStatusEnum.PENDING,
        },
        type: {
            type: String,
            enum: TransactionTypeEnum,
            default: TransactionTypeEnum.TRANSFER,
        },
        verificationToken: {
            type: String,
        },
        verificationExpiry: {
            type: Date,
        },
    },
    { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;
