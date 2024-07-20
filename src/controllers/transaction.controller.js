import { asyncHandler } from "../utils/asyncHandler.js";
import Transaction from "../models/transaction.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import {
    emailQueue,
    notificationQueue,
    transactionQueue,
} from "../utils/Queue.js";
import {
    EmailSendEnum,
    TransactionStatusEnum,
    TransactionTypeEnum,
} from "../constants.js";
import {
    cryptoTokenVerify,
    generateVerificationToken,
    verificationUrl,
} from "../utils/index.js";

const sendMoney = asyncHandler(async (req, res) => {
    const { _id: senderId, userName, email } = req.user;
    if (!senderId) {
        throw new ApiError(401, "You must be logged in to send money!");
    }

    const { receiverEmail, amount, description } = req.body;

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
        amount: amount,
        description: description,
        status: TransactionStatusEnum.PENDING,
        type: TransactionTypeEnum.TRANSFER,
    });
    if (!transaction) {
        throw new ApiError(400, "Transaction Failed!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateVerificationToken();

    transaction.verificationToken = hashedToken;
    transaction.verificationExpiry = tokenExpiry;
    await transaction.save({ validateBeforeSave: false });

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "transactions");
    await emailQueue(userName, email, EmailSendEnum.TRANSACTION_VERIFY, url);
    await notificationQueue(
        senderId,
        "VERIFICATION",
        "Verify Your Transaction"
    );

    return res.status(202).json(
        new ApiResponse(
            202,
            {
                message:
                    "Your Transaction is Pending! Please Verify Your Transaction!",
                success: true,
                status: TransactionStatusEnum.PENDING,
            },
            "Your Transaction is Pending! Please Verify Your Transaction!"
        )
    );
});

const transactionVerify = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;
    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    const hashedToken = cryptoTokenVerify(verificationToken);

    const transaction = await Transaction.findOne({
        verificationToken: hashedToken,
        verificationExpiry: { $gt: Date.now() },
        status: TransactionStatusEnum.PENDING,
    });
    if (!transaction) {
        throw new ApiError(404, "Transaction not found!");
    }

    transaction.verificationToken = undefined;
    transaction.verificationExpiry = undefined;
    transaction.status = TransactionStatusEnum.QUEUED;

    await transaction.save({ validateBeforeSave: false });
    await transactionQueue(transaction.from, transaction._id);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                message:
                    "Verification Successful, your transaction will be processed soon.",
                status: TransactionStatusEnum.QUEUED,
            },
            "Transaction Queued!"
        )
    );
});

const requestMoney = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "You must be logged in to request money!");
    }

    const { senderEmail, amount, description } = req.body;

    // Find the user to request money
    const findUserToRequest = await User.findOne({
        email: senderEmail,
        isEmailVerified: true,
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
        status: TransactionStatusEnum.PENDING,
        type: TransactionTypeEnum.REQUEST,
    });
    if (!transaction) {
        throw new ApiError(400, "Request Failed!");
    }

    res.status(201).json(
        new ApiResponse(
            201,
            { message: "Request Successful!", success: true },
            "Request Successful!"
        )
    );
    // TODO: Send Notification to the user (which have to send money to the requested user)
});

const approveRequestedPayment = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { transactionId } = req.params;
    if (!transactionId) {
        throw new ApiError(400, "Transaction Id is missing!");
    }

    const transaction = await Transaction.findOne({
        _id: transactionId,
        to: userId,
        status: TransactionStatusEnum.PENDING,
        type: TransactionTypeEnum.REQUEST,
    });

    if (!transaction) {
        throw new ApiError(400, "Transaction not found!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateVerificationToken();

    transaction.verificationToken = hashedToken;
    transaction.verificationExpiry = tokenExpiry;
    await transaction.save({ validateBeforeSave: false });

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "transactions");
    await emailQueue(userName, email, EmailSendEnum.TRANSACTION_VERIFY, url);
    await notificationQueue(userId, "VERIFICATION", "Verify Your Transaction");

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                message: "Payment in process. Please verify transaction!",
                success: true,
            },
            "Payment in process. Please verify transaction!"
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
        $or: [
            { from: userId, status: "COMPLETED" },
            { to: userId, status: "COMPLETED" },
        ],
    }).populate("from to", "-_id userName email");

    if (!transactions) {
        throw new ApiError(400, "No Transactions Found!");
    }

    transactions.reverse();
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
        type: TransactionTypeEnum.REQUEST,
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
