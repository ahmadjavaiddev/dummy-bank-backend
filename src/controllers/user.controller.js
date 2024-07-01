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

    await emailQueue.add("sendRegisterEmail", {
        userName: newUser.userName,
        email: newUser.email,
        type: `REGISTER`,
        subject: `Verify Your Email to Continue`,
        verificationCode: newUser.verificationCode.code,
    });

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: newUser },
                "Please check your email to verify your account!"
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

    await emailQueue.add("sendLoginEmail", {
        userName: loggedInUser.userName,
        email: loggedInUser.email,
        type: `LOGIN`,
        subject: `Login Verification`,
        verificationCode: loggedInUser.verificationCode.code,
    });

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser },
                "Please check your email for verification code!"
            )
        );
});

const verifyUser = asyncHandler(async (req, res) => {
    const { userId, verificationCode, type } = req.body;
    if (
        userId.trim() === "" ||
        verificationCode.trim() === "" ||
        type.trim() === "" ||
        !userId ||
        !!verificationCode ||
        !type
    ) {
        throw new ApiError(
            401,
            "User ID, Type and Verification Code is Required!"
        );
    }

    const user = await User.findById(userId);
    if (
        !user ||
        !user.verified ||
        user.verificationCode.code !== verificationCode ||
        user.verificationCode.expiry < Date.now() ||
        user.verificationCode.type !== type
    ) {
        throw new ApiError(401, "Invalid Verification Code!");
    }

    user.verificationCode.code = "";
    user.verificationCode.expiry = "";
    user.verificationCode.type = "";

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "User Verified Successfully!", success: true },
                "User Verified Successfully!"
            )
        );
});

const verifyUserIP = asyncHandler(async (req, res) => {
    const { email, verificationCode } = req.body;
    const ipAddress = req.ip;

    if (ipAddress.trim() === "") {
        throw new ApiError(401, "IP Address is not valid!");
    }

    const user = await User.findOne({ email });
    if (
        !user ||
        !user.verified ||
        user.lastLoginIP.ip !== ipAddress ||
        user.lastLoginIP.code !== verificationCode ||
        user.lastLoginIP.codeExpiry < Date.now()
    ) {
        throw new ApiError(401, "Invalid Verification Code!");
    }

    user.lastLoginIP.code = "";
    user.lastLoginIP.verified = true;
    user.lastLoginIP.codeExpiry = "";
    user.lastLoginIP.expiry = new Date(Date.now() + 1 * 1000 * 60 * 60 * 3); // 3 Days Expiry
    user.ipVerifyEmail.sent = false;
    user.ipVerifyEmail.expiry = "";

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

const forgetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email || email.trim() === "") {
        throw new ApiError(401, "Email is Required!");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(401, "User Not Found!");
    }

    const resetToken = `${
        Date.now() * Math.floor(Math.random() * 100000)
    }-${uuid()}-${Date.now()}`;

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiry = new Date(Date.now() + 3600000);

    await user.save({ validateBeforeSave: false });

    await emailQueue.add("sendForgotEmail", {
        userName: user.userName,
        email: user.email,
        type: `FORGOT`,
        subject: `Forgot Password Request`,
        verificationCode: resetToken,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                null,
                "Please Check Your Email Inbox To Reset Your Password!"
            )
        );
});

const resetpassword = asyncHandler(async (req, res) => {
    const { password, resetToken } = req.body;
    if (
        !password ||
        password.trim() === "" ||
        !resetToken ||
        password.trim() === ""
    ) {
        throw new ApiError(401, "Password and Token is Required!");
    }

    const user = await User.findOne({ resetPasswordToken: resetToken });
    if (!user || user.resetPasswordTokenExpiry < Date.now()) {
        throw new ApiError(401, "Invalid Token!");
    }

    const hashedPassword = await argon2.hash(password);
    user.password = hashedPassword;
    user.resetPasswordToken = "";
    user.resetPasswordTokenExpiry = "";
    await user.save({ validateBeforeSave: false });

    await emailQueue.add("sendResetEmail", {
        userName: user.userName,
        email: user.email,
        type: `RESET`,
        subject: `Your Password has been changed`,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                null,
                "Your password has been changed successfully!"
            )
        );
});

export {
    registerUser,
    loginUser,
    verifyUser,
    verifyUserIP,
    getUser,
    updateUser,
    updateMPIN,
    forgetPassword,
    resetpassword,
};
