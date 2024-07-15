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
    if (!type) {
        return `${req.protocol}://${req.get(
            "host"
        )}/api/v1/users/verify/${token}`;
    }
    if (type === "forgot") {
        return `${req.protocol}://${req.get(
            "host"
        )}/api/v1/users/reset-password/${token}`;
    }
    if (type === "transactions") {
        return `${req.protocol}://${req.get(
            "host"
        )}/api/v1/transactions/verify/${token}`;
    }
};

const encryptMPIN = (mpin) => {
    const key = crypto.randomBytes(32); // AES-256 requires a 32-byte key
    const iv = crypto.randomBytes(16); // AES requires a 16-byte IV

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(mpin, "utf8", "hex");
    encrypted += cipher.final("hex");
    return { encrypted, key, iv };
};

const decryptMPIN = (encryptedMPIN, key, iv) => {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedMPIN, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};

const cryptoTokenVerify = (token) => {
    let hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    return hashedToken;
};

export {
    generateVerificationToken,
    verificationUrl,
    encryptMPIN,
    decryptMPIN,
    cryptoTokenVerify,
};
