import { asyncHandler } from "../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import {
    requestMoneySchema,
    sendMoneySchema,
} from "../schemas/transaction.schema.js";
import { transactionQueue } from "../utils/Queue.js";
import crypto from "crypto";
// import { sendEmail } from "../utils/sendEmail.js";
import { EmailSendEnum } from "../constants.js";

const sendMoney = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    if (!senderId) {
        throw new ApiError(401, "You must be logged in to send money!");
    }

    const { name, receiverEmail, amount, description } = req.body;
    const numberAmount = Number(amount);

    sendMoneySchema.parse({
        name,
        receiverEmail,
        amount: numberAmount,
        description,
    });

    // Check if the amount is valid
    if (isNaN(numberAmount) || numberAmount <= 0) {
        throw new ApiError(400, "Invalid Amount!");
    }

    const receiver = await User.findOne({
        email: receiverEmail,
        isEmailVerified: true,
    });
    if (!receiver) {
        throw new ApiError(404, "Invalid User Email! OR User is not verified!");
    }

    const transaction = await Transaction.create({
        from: senderId,
        to: receiver._id,
        amount: numberAmount,
        name: name,
        description: description,
        status: "PENDING",
        type: "TRANSFER",
    });
    if (!transaction) {
        throw new ApiError(400, "Transaction Failed!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        transaction.generateVerificationToken();

    transaction.verificationToken = hashedToken;
    transaction.verificationExpiry = tokenExpiry;
    await transaction.save({ validateBeforeSave: false });

    const { userName, email } = req.user;

    // Add Email To Queue
    // await sendEmail(EmailSendEnum.TRANSACTION_VERIFY, {
    //     userName: userName,
    //     email: email,
    //     type: EmailSendEnum.TRANSACTION_VERIFY,
    //     code: `${req.protocol}://${req.get(
    //         "host"
    //     )}/api/v1/transactions/verify/${unHashedToken}`,
    // });

    return res.status(202).json({ message: "Transaction received" });
});

const transactionVerify = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    let hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const transaction = await Transaction.findOne({
        verificationToken: hashedToken,
        verificationExpiry: { $gt: Date.now() },
        status: "PENDING",
    });
    if (!transaction) {
        throw new ApiError(404, "Transaction not found!");
    }

    transaction.verificationToken = undefined;
    transaction.verificationExpiry = undefined;
    transaction.status = "QUEUED";

    await transaction.save({ validateBeforeSave: false });

    await transactionQueue({ transactionId: transaction._id });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                message:
                    "Verification Successful, your transaction will be processed soon.",
                status: "QUEUED",
            },
            "Email is verified"
        )
    );
});

const requestMoney = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to request money!");
    }

    requestMoneySchema.parse(req.body);
    const { senderEmail, amount, description } = req.body;

    // Check if the amount is valid
    if (isNaN(amount) || amount <= 0) {
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
        amount: amount,
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

export {
    sendMoney,
    transactionVerify,
    requestMoney,
    getTransactions,
    requestedTransactions,
};
