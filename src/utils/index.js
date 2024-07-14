import { TRANSACTION_TOKEN_EXPIRY } from "../constants.js";
import crypto from "crypto";

const generateVerificationToken = () => {
    const unHashedToken = crypto.randomBytes(20).toString("hex");

    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex");

    const tokenExpiry = Date.now() + TRANSACTION_TOKEN_EXPIRY;

    return { unHashedToken, hashedToken, tokenExpiry };
};

const verificationUrl = (req, token, type) => {
    return `${req.protocol}://${req.get(
        "host"
    )}/api/v1/${type}/verify/${token}`;
};

export { generateVerificationToken, verificationUrl };
