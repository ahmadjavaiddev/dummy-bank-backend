import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import argon2 from "argon2";
import {
    UpdateMPINSchema,
    loginSchema,
    registerSchema,
    updateUserSchema,
} from "../schemas/user.schema.js";
import { UserSelectSecureSchema, cookieOptions } from "../constants.js";
import { redisClient } from "../utils/redis.js";
import { emailQueue } from "../utils/Queue.js";

const generateToken = async (userId, type) => {
    try {
        const accessTokenId = `${uuid()}-${Date.now()}`;
        const accessTokenExpiry = new Date(Date.now() + 1000 * 60 * 60);
        const verificationCode = Math.floor(100000 + Math.random() * 900000);

        const accessToken = await jwt.sign(
            {
                _id: userId,
                accessTokenId: accessTokenId,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
            }
        );

        const user = await User.findById(userId);
        user.accessToken = accessToken;
        user.accessTokenId = accessTokenId;
        user.accessTokenExpiry = accessTokenExpiry;
        if (type === "LOGIN") {
            user.verificationCode = {
                code: verificationCode,
                type: "LOGIN",
                expiry: new Date(Date.now() + 1000 * 60 * 60),
            };
        } else {
            user.verificationCode = {
                code: verificationCode,
                type: "REGISTER",
                expiry: new Date(Date.now() + 1000 * 60 * 60),
            };
        }

        await user.save({ validateBeforeSave: false });

        return accessToken;
    } catch (error) {
        console.log("Error in generateToken ::", error);
    }
};

const registerUser = asyncHandler(async (req, res) => {
    registerSchema.parse(req.body);
    const { firstName, lastName, userName, email, password } = req.body;

    const existingUser = await User.findOne({ userName, email });
    if (existingUser) {
        throw new ApiError(401, "User already exists!");
    }

    const hashedPassword = await argon2.hash(password);
    const user = await User.create({
        firstName: firstName,
        lastName: lastName,
        userName: userName,
        email: email,
        password: hashedPassword,
    });

    const accessToken = await generateToken(user._id, "REGISTER");

    const newUser = await User.findById(user._id).select(
        UserSelectSecureSchema
    );

    await emailQueue.add("sendEmail", {
        userName: newUser.userName,
        email: newUser.email,
        type: `Verify Your Email to continue ${newUser.verificationCode.type}`,
        verificationCode: newUser.verificationCode.code,
    });

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: newUser },
                "User Registered Successfully!"
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    loginSchema.parse(req.body);
    const { email, password } = req.body;

    const user = await User.findOne({ email, verified: true });
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

    const isValidPassword = await argon2.verify(user.password, password);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password!");
    }

    const accessToken = await generateToken(user._id, "LOGIN");

    const loggedInUser = await User.findById(user._id).select(
        UserSelectSecureSchema
    );

    await emailQueue.add("sendEmail", {
        userName: loggedInUser.userName,
        email: loggedInUser.email,
        type: `${loggedInUser.verificationCode.type} Verification!`,
        verificationCode: loggedInUser.verificationCode.code,
    });

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser },
                "User Login Successfully!"
            )
        );
});

const verifyUserIP = asyncHandler(async (req, res) => {
    const { verificationCode } = req.body;
    const ipAddress = req.ip;

    if (ipAddress.trim() === "") {
        throw new ApiError(401, "IP Address is not valid!");
    }

    const user = await User.findOne({ ipVerificationCode: verificationCode });
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

    if (!user.verified || user.ipVerificationCode !== verificationCode) {
        throw new ApiError(401, "User not verified! OR Code is invalid!");
    }

    const uniqueIpAddresses = user.verifiedIPS.filter(
        (verifiedIP) => verifiedIP.ip === ipAddress
    );

    if (uniqueIpAddresses.length > 0) {
        user.verifiedIPS = user.verifiedIPS.map((verifiedIp) => {
            if (verifiedIp.ip === ipAddress) {
                verifiedIp.expiry = Date.now() + 1000 * 60 * 60 * 24 * 3; // 3 days in milliseconds
            }
            return verifiedIp;
        });
    } else {
        user.verifiedIPS.push({
            ip: ipAddress,
            verified: true,
            expiry: Date.now() + 1000 * 60 * 60 * 24 * 3, // 3 days in milliseconds
        });
    }

    user.ipVerificationCode = "";

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "IP Verified Successfully!", success: true },
                "IP Verified Successfully!"
            )
        );
});

const getUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "User not found!");
    }

    const cachedUser = await redisClient.get(`user:${userId}`);
    if (cachedUser) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { user: JSON.parse(cachedUser) },
                    "User Fetched Successfully!"
                )
            );
    }

    const user = await User.findOne({ _id: userId, verified: true }).select(
        UserSelectSecureSchema
    );
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

    await redisClient.set(`user:${userId}`, JSON.stringify(user));

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user: user }, "User Fetched Successfully!")
        );
});

const updateUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "User not found!");
    }

    updateUserSchema.parse(req.body);
    const { firstName, lastName } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                firstName: firstName,
                lastName: lastName,
            },
        },
        {
            new: true,
            runValidators: true,
        }
    ).select(UserSelectSecureSchema);
    await redisClient.del(`user:${userId}`);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: user, message: "User Updated SuccessFully!" },
                "User Updated SuccessFully!"
            )
        );
});

const updateMPIN = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "User not found!");
    }

    UpdateMPINSchema.parse(req.body.mPin);
    const { mPin } = req.body;

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                mPin: {
                    code: mPin,
                    enabled: true,
                },
            },
        },
        {
            new: true,
            runValidators: true,
        }
    ).select(UserSelectSecureSchema);

    return res
        .status(200)
        .json(
            new ApiResponse(200, { user: user }, "MPIN Updated SuccessFully!")
        );
});

export {
    registerUser,
    loginUser,
    verifyUserIP,
    getUser,
    updateUser,
    updateMPIN,
};
