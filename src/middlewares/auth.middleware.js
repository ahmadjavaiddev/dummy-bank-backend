import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { oneHour, sixDigit, UserSelectSecureSchema } from "../constants.js";

const verifyJWT = async (req, _, next) => {
    try {
        // Extract the token from cookies or Authorization header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Authentication token not found."));
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded._id);
        if (!user) {
            return next(new ApiError(401, "Authentication failed."));
        }
        // Check user verification status and token validity
        const isTokenValid = decoded.accessTokenId === user.accessTokenId;
        if (
            !user.verified ||
            user.accessTokenExpiry < Date.now() ||
            !isTokenValid
        ) {
            return next(new ApiError(401, "Invalid authentication token."));
        }

        const verifiedIp = user.lastLoginIP;
        // Check If the IP Address is Valid OR Not. If IP Address Is Valid Then Skip The IP Verification Part
        if (
            !verifiedIp ||
            !verifiedIp.ip ||
            !verifiedIp.verified ||
            verifiedIp.expiry < Date.now()
        ) {
            // Check If Email Already Sent Return Back
            if (
                user.ipVerifyEmail.sent ||
                user.ipVerifyEmail.expiry < Date.now()
            ) {
                console.log("Already Sent!");
                return next(
                    new ApiError(
                        401,
                        "IP Address is not verified. Please check your email to verify your IP"
                    )
                );
            }

            // Generate Verification Code
            const verificationCode = sixDigit;
            const ipAddress = req.ip;

            // Set User IP Details In DB
            user.verificationCode = {
                code: verificationCode,
                type: "IP",
                expiry: oneHour,
            };
            user.lastLoginIP = {
                ip: ipAddress,
                verified: false,
            };
            user.ipVerifyEmail.sent = true;
            user.ipVerifyEmail.expiry = fifteenMinutes;
            await user.save({ validateBeforeSave: false });

            // Add Email To Queue

            await sendEmail(user.userName, user.email, "IP", verificationCode);

            // Alert The User
            return next(
                new ApiError(
                    401,
                    "IP Address is not verified. Please check your email to verify your IP"
                )
            );
        }

        // Fetch User Without The Some Important Fields
        const verifiedUser = await User.findById(user._id).select(
            UserSelectSecureSchema
        );

        // Attach the user to the request object
        req.user = verifiedUser;
        next();
    } catch (error) {
        // Pass the error to the next middleware
        next(new ApiError(401, "Invalid access token."));
    }
};

export default verifyJWT;
