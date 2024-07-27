import Card from "../models/card.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateUniqueCard } from "../utils/cardHelpers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
    cryptoTokenVerify,
    generateVerificationToken,
    verificationUrl,
} from "../utils/index.js";
import { EmailSendEnum } from "../constants.js";
import { emailQueue, notificationQueue } from "../utils/Queue.js";

const createCard = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { pinCode } = req.body;

    const user = await User.findOne({
        _id: userId,
        haveCard: false,
    });
    if (!user) {
        throw new ApiError(
            401,
            "User is not valid OR User already have a card"
        );
    }

    // Generate unique Card details
    const { cardNumber, expiryDate, issueDate, cvv } =
        await generateUniqueCard();

    // Create card
    const card = await Card.create({
        cardHolder: userId,
        cardNumber: cardNumber,
        issueDate: issueDate,
        expiryDate: expiryDate,
        cvv: cvv,
        pinCode: pinCode,
    });
    if (!card) {
        throw new ApiError(400, "Card not created");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateVerificationToken();

    card.verificationToken = hashedToken;
    card.verificationExpiry = tokenExpiry;
    await card.save({ validateBeforeSave: false });

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "card");
    await emailQueue(user.userName, user.email, EmailSendEnum.CARD_VERIFY, url);
    await notificationQueue(
        userId,
        "VERIFICATION",
        "Verify Your Card Creation"
    );

    return res.status(201).json(
        new ApiResponse(
            202,
            {
                message: "Please Verify Your Card Creation!",
                success: true,
            },
            "Please Verify Your Card Creation!"
        )
    );
});

const verifyAndCreateCard = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;
    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    const hashedToken = cryptoTokenVerify(verificationToken);

    const card = await Card.findOne({
        verificationToken: hashedToken,
        verificationExpiry: { $gt: Date.now() },
    });
    if (!card) {
        throw new ApiError(404, "Invalid Verification Token!");
    }

    const user = await User.findOneAndUpdate(
        { _id: card.cardHolder },
        {
            $set: {
                haveCard: true,
            },
        }
    );
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    card.verificationToken = undefined;
    card.verificationExpiry = undefined;
    card.verified = true;

    await card.save({ validateBeforeSave: false });
    await notificationQueue(user._id, "CARD", "User Card Created.");

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                message: "User Card Created.",
                success: true,
            },
            "Card created"
        )
    );
});

export { createCard, verifyAndCreateCard };
