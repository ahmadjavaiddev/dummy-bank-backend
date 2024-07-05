import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
    fifteenMinutes,
    oneHour,
    sixDigit,
    UserSelectSecureSchema,
} from "../constants.js";
import { redisClient } from "../utils/redis.js";
import { sendEmail } from "../utils/sendEmail.js"; // Ensure you import the sendEmail function

const verifyJWT = async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Authentication token not found."));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded._id).exec();

        if (!user) {
            return next(new ApiError(401, "Authentication failed."));
        }

        const isTokenValid = decoded.accessTokenId === user.accessTokenId;

        if (
            !user.verified ||
            user.accessTokenExpiry < Date.now() ||
            !isTokenValid
        ) {
            return next(new ApiError(401, "Invalid authentication token."));
        }

        const ipAddress = req.ip;
        const verifiedIp = user.lastLoginIP;

        if (
            !verifiedIp ||
            !verifiedIp.ip ||
            verifiedIp.ip !== ipAddress ||
            !verifiedIp.verified ||
            verifiedIp.expiry < Date.now()
        ) {
            await redisClient.del(`user:verified:${user._id}`);

            Object.assign(user.lastLoginIP, {
                ip: "",
                verified: false,
                expiry: "",
            });

            Object.assign(user.ipVerifyEmail, {
                sent: false,
                expiry: "",
            });

            await user.save({ validateBeforeSave: false });

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

            const verificationCode = sixDigit();
            user.verificationCode = {
                code: verificationCode,
                type: "IP",
                expiry: oneHour,
            };

            Object.assign(user.lastLoginIP, {
                ip: ipAddress,
                verified: false,
            });

            Object.assign(user.ipVerifyEmail, {
                sent: true,
                expiry: fifteenMinutes(),
            });

            await user.save({ validateBeforeSave: false });

            await sendEmail(user.userName, user.email, "IP", verificationCode);

            return next(
                new ApiError(
                    401,
                    "IP Address is not verified. Please check your email to verify your IP"
                )
            );
        }

        const verifiedUser = await User.findById(user._id)
            .select(UserSelectSecureSchema)
            .exec();
        req.user = verifiedUser;
        next();
    } catch (error) {
        next(new ApiError(401, "Invalid access token."));
    }
};

export default verifyJWT;
