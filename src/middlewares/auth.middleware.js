import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { UserSelectSecureSchema } from "../constants.js";
import { emailQueue } from "../utils/Queue.js";

const verifyJWT = async (req, _, next) => {
    try {
        // Extract the token from cookies or Authorization header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Authentication token not found."));
        }

        console.log("Log 1 ::", token);

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded._id);
        if (!user) {
            return next(new ApiError(401, "Authentication failed."));
        }
        console.log("Log 2 ::", user);

        // Check user verification status and token validity
        const isTokenValid = decoded.accessTokenId === user.accessTokenId;
        if (
            !user.verified ||
            user.accessTokenExpiry < Date.now() ||
            !isTokenValid
        ) {
            console.log("Log 3 ::", isTokenValid);
            return next(new ApiError(401, "Invalid authentication token."));
        }

        const verifiedIp = user.lastLoginIP;
        console.log("Log 4 ::", verifiedIp);
        // Check If the IP Address is Valid OR Not. If IP Address Is Valid Then Skip The IP Verification Part
        if (
            !verifiedIp ||
            !verifiedIp.ip ||
            !verifiedIp.verified ||
            verifiedIp.expiry < Date.now()
        ) {
            console.log("Log 5");
            // Check If Email Already Sent Return Back
            if (
                user.ipVerifyEmail.sent ||
                user.ipVerifyEmail.expiry < Date.now()
            ) {
                console.log("Log 6");
                console.log("Already Sent!");
                return next(
                    new ApiError(
                        401,
                        "IP Address is not verified. Please check your email to verify your IP"
                    )
                );
            }

            // Generate Verification Code
            const verificationCode = Math.floor(
                100000 + Math.random() * 900000
            );
            const requestedIpAddress = req.ip;
            console.log("Log 7 ::", requestedIpAddress);
            // Set User IP Details In DB
            user.lastLoginIP = {
                ip: requestedIpAddress,
                verified: false,
                code: verificationCode,
                codeExpiry: new Date(Date.now() + 1 * 1000 * 60 * 60),
            };
            user.ipVerifyEmail.sent = true;
            user.ipVerifyEmail.expiry = new Date(
                Date.now() + 1 * 1000 * 60 * 15
            );
            console.log("Log 8");
            await user.save();
            console.log("Log 9");

            // Add Email To Queue
            await emailQueue.add("sendIpVerificationEmail", {
                userName: user.userName,
                email: user.email,
                type: `IP`,
                subject: `Verify Your IP Address`,
                verificationCode: verificationCode,
            });
            console.log("Log 10");

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
        console.log("Log 11 ::", verifiedUser);

        // Attach the user to the request object
        req.user = verifiedUser;
        next();
    } catch (error) {
        // Pass the error to the next middleware
        next(new ApiError(401, "Invalid access token."));
    }
};

export default verifyJWT;
