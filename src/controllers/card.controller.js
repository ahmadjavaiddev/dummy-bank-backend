import Card from "../models/card.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateUniqueCard } from "../utils/cardHelpers.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const createCard = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { code } = req.body;

    // Check if User has a card
    const userHaveCard = await User.findOne({
        _id: userId,
        verified: true,
        haveCard: true,
    });
    if (userHaveCard) {
        throw new ApiError(401, "You already have a card");
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
        code: code,
    });
    if (!card) {
        throw new ApiError(400, "Card not created");
    }

    // Update User
    const user = await User.findOneAndUpdate(
        { _id: userId },
        {
            $set: {
                haveCard: true,
            },
        }
    );
    if (!user) {
        throw new ApiError(400, "User not found");
    }

    return res.status(201).json(new ApiResponse(201, card, "Card created"));
});

export { createCard };
