import { UserSecureSelect } from "../constants.js";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { redisClient } from "../utils/redis.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }
    let userId;

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        userId = decodedToken._id;

        const cachedUser = await redisClient.get(`user:${decodedToken._id}`);
        if (cachedUser) {
            req.user = JSON.parse(cachedUser);
        } else {
            const user = await User.findOne({
                _id: decodedToken?._id,
                isEmailVerified: true,
                isLoggedIn: true,
            }).select(UserSecureSelect);
            if (!user) {
                throw new ApiError(401, "Invalid User Identity");
            }

            await redisClient.set(
                `user:${user._id}`,
                JSON.stringify(user),
                "EX",
                3600
            );
            req.user = user;
        }

        next();
    } catch (error) {
        await User.findByIdAndUpdate(userId, {
            isLoggedIn: false,
        });
        await redisClient.del(`user:${userId}`);

        throw new ApiError(401, error?.message || "Invalid access token");
    }
});

export default verifyJWT;
