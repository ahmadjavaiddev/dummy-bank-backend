import { asyncHandler } from "../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";

const sendMoney = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    if (!senderId) {
        throw new ApiError(401, "You must be logged in to send money!");
    }

    const { receiverEmail, amount, description } = req.body;
    if (!receiverEmail || !amount) {
        throw new ApiError(401, "Missing required fields!");
    }

    // Check if the amount is valid
    const amountToSend = Number(amount);
    if (isNaN(amountToSend) || amountToSend <= 0) {
        throw new ApiError(400, "Invalid Amount!");
    }

    // Check if the user has enough balance
    const sender = await User.findOne({ _id: senderId, verified: true });
    if (!sender) {
        throw new ApiError(401, "UnAuthorized User!");
    }
    if (
        sender.balance <= 0 ||
        sender.balance < amountToSend ||
        sender.balance - amountToSend < 0
    ) {
        throw new ApiError(400, "Insufficient Balance!");
    }

    // Find the receiver
    const receiver = await User.findOne({
        email: receiverEmail,
        verified: true,
    });
    if (!receiver) {
        throw new ApiError(400, "User Not Found!");
    }

    // Update the balance of the sender
    sender.balance = sender.balance - amountToSend;
    await sender.save();

    // Update the balance of the receiver
    receiver.balance = receiver.balance + amountToSend;
    await receiver.save();

    // Create the transaction
    const transaction = await Transaction.create({
        from: senderId,
        to: receiver._id,
        amount: amountToSend,
        description: description,
        status: "COMPLETED",
        type: "TRANSFER",
    });
    if (!transaction) {
        throw new ApiError(400, "Transaction Failed!");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { message: "Transaction Successful!", success: true },
                "Transaction Successful!"
            )
        );
});

const requestMoney = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to request money!");
    }

    const { senderEmail, amount, description } = req.body;
    if (!senderEmail || !amount) {
        throw new ApiError(401, "Missing required fields!");
    }

    // Check if the amount is valid
    const amountToSend = Number(amount);
    if (isNaN(amountToSend) || amountToSend <= 0) {
        throw new ApiError(401, "Invalid Amount!");
    }

    // Find the user to request money
    const findUserToRequest = await User.findOne({
        email: senderEmail,
        verified: true,
    });
    if (!findUserToRequest) {
        throw new ApiError(400, "User Not Found!");
    }

    // Create the transaction
    const transaction = await Transaction.create({
        from: findUserToRequest._id,
        to: userId,
        amount: amountToSend,
        description: description,
        status: "PENDING",
        type: "REQUEST",
    });
    if (!transaction) {
        throw new ApiError(400, "Request Failed!");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { message: "Request Successful!", success: true },
                "Request Successful!"
            )
        );
});

const getTransactions = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to get transactions!");
    }

    // Find the User Completed Transactions
    const transactions = await Transaction.find({
        from: userId,
        status: "COMPLETED",
    });
    if (!transactions) {
        throw new ApiError(400, "No Transactions Found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "Transactions Found!", success: true, transactions },
                "Transactions Found!"
            )
        );
});

const requestedTransactions = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to get transactions!");
    }

    // Find the User Requested Transactions
    const transactions = await Transaction.find({
        to: userId,
        type: "REQUEST",
    });
    if (!transactions) {
        throw new ApiError(400, "No Transactions Found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "Transactions Found!", success: true, transactions },
                "Transactions Found!"
            )
        );
});

const getTransactionsByType = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to get transactions!");
    }

    const { type } = req.query;
    if (!type) {
        throw new ApiError(400, "Missing required fields!");
    }

    // Find the User Completed Transactions
    const transactions = await Transaction.find({
        from: userId,
        type: type,
    });
    if (!transactions) {
        throw new ApiError(400, "No Transactions Found!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "Transactions Found!", success: true, transactions },
                "Transactions Found!"
            )
        );
});

export { sendMoney, requestMoney, getTransactions, requestedTransactions };
