import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { v4 as uuid } from "uuid";
import argon2 from "argon2";
import {
    UpdateMPINSchema,
    loginSchema,
    registerSchema,
    updateUserSchema,
} from "../schemas/user.schema.js";
import {
    EmailSendEnum,
    UserSecureSelect,
    UserSelectSecureSchema,
    cookieOptions,
} from "../constants.js";
import { redisClient } from "../utils/redis.js";
// import { sendEmail } from "../utils/sendEmail.js";
import { generateIBAN } from "../utils/generateIban.js";
import jwt from "jsonwebtoken";
import { generateVerificationToken, verificationUrl } from "../utils/index.js";
import { emailQueue } from "../utils/Queue.js";
import crypto from "crypto";

const generateAccessAndRefreshTokens = async (userId, type) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        const { unHashedToken, hashedToken, tokenExpiry } =
            generateVerificationToken();

        // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
        user.refreshToken = refreshToken;
        user.verificationToken = hashedToken;
        user.verificationExpiry = tokenExpiry;
        user.isLoggedIn = false;

        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken, unHashedToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating the access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    registerSchema.parse(req.body);
    const { firstName, lastName, userName, email, password } = req.body;

    const existingUser = await User.findOne({
        $or: [{ userName }, { email }],
    });
    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Generate IBAN for the user
    const { IBAN, accountNumber } = await generateIBAN();

    const user = await User.create({
        firstName,
        lastName,
        userName,
        email,
        password,
        IBAN,
        accountNumber,
        isEmailVerified: false,
    });

    const { accessToken, refreshToken, unHashedToken } =
        await generateAccessAndRefreshTokens(user._id);
    const newUser = await User.findById(user._id).select(UserSecureSelect);

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "users");
    await emailQueue(userName, email, EmailSendEnum.REGISTER, url);

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: newUser, accessToken: accessToken },
                "Please check your email to verify your account!"
            )
        );
});

const loginUser = asyncHandler(async (req, res) => {
    loginSchema.parse(req.body);
    const { email, password } = req.body;

    const user = await User.findOne({ email, isEmailVerified: true });
    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password!");
    }

    const { accessToken, refreshToken, unHashedToken } =
        await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select(UserSecureSelect);

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "users");
    await emailQueue(loggedInUser.userName, email, EmailSendEnum.LOGIN, url);

    return res
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                },
                "Please check your email for verification code!"
            )
        );
});

const verifyUser = asyncHandler(async (req, res) => {
    const { token } = req.params;

    if (!token) {
        throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    let hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationExpiry: { $gt: Date.now() },
    });
    if (!user) {
        throw new ApiError(404, "User not found!");
    }
    Object.assign(user, {
        isEmailVerified: true,
        isLoggedIn: true,
        verificationToken: undefined,
        verificationExpiry: undefined,
    });

    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                message: "Verified Successfully",
            },
            "Verified Successfully"
        )
    );
});

const getUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await redisClient.del(`user:${req.user._id}`);
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: "",
                isLoggedIn: false,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
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

    // Add Email To Queue
    await sendEmail(user.userName, user.email, "MPIN-UPDATED");

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

    // Add Email To Queue
    await sendEmail(user.userName, user.email, "FORGOT", resetToken);

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

    // Add Email To Queue
    await sendEmail(user.userName, user.email, "PASSWORD-RESET");

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

// const isUserVerified = asyncHandler(async (req, res) => {
//     const { _id } = req.user;
//     if (!_id) {
//         throw new ApiError(400, "User ID required!");
//     }

//     const cachedUser = await redisClient.get(`user:${_id}`);
//     if (cachedUser) {
//         const user = JSON.parse(cachedUser);
//         // return res.status(200).json({
//         //     message: "User Verified!",
//         //     success: true,
//         //     userId: user.userId,
//         //     IP: user.IP,
//         // });
//         return res
//             .status(200)
//             .json(new ApiResponse(200, user, "User is verified"));
//     }

//     const user = await User.findById(_id).select(UserSecureSelect);
//     if (!user) {
//         throw new ApiError(401, "User ID required!");
//     }

//     return res.status(200).json(new ApiResponse(200, user, "User is verified"));
// });

const userHaveOTP = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        throw new ApiError(400, "User ID is required!");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User Not Found!");
    }

    const youHaveOTP = user.verificationCode.code.length === 6 ? true : false;

    return res
        .status(200)
        .json({ message: "Request Processed!", exists: youHaveOTP });
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // check if incoming refresh token is same as the refresh token attached in the user document
        // This shows that the refresh token is used or not
        // Once it is used, we are replacing it with new refresh token below
        if (incomingRefreshToken !== user?.refreshToken) {
            // If token is valid but is used already
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", newRefreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

export {
    registerUser,
    loginUser,
    verifyUser,
    getUser,
    logoutUser,
    updateUser,
    updateMPIN,
    forgetPassword,
    resetpassword,
    // isUserVerified,
    userHaveOTP,
    refreshAccessToken,
};
