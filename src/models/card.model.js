import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
    {
        cardHolder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Card holder is required"],
        },
        cardNumber: {
            type: String,
            required: [true, "Card number is required"],
        },
        issueDate: {
            type: String,
            required: [true, "Expiry date is required"],
        },
        expiryDate: {
            type: String,
            required: [true, "Expiry date is required"],
        },
        cvv: {
            type: String,
            required: [true, "CVV is required"],
        },
        pinCode: {
            type: String,
            required: [true, "pinCode is required"],
        },
        verified: {
            type: Boolean,
            default: false,
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

const Card = mongoose.model("Card", cardSchema);

export default Card;
