import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    EmailSendEnum,
    UserSecureSelect,
    cookieOptions,
} from "../constants.js";
import { redisClient } from "../utils/redis.js";
import { generateIBAN } from "../utils/generateIban.js";
import jwt from "jsonwebtoken";
import {
    cryptoTokenVerify,
    encryptMPIN,
    generateVerificationToken,
    verificationUrl,
} from "../utils/index.js";
import { emailQueue } from "../utils/Queue.js";

const generateAccessAndRefreshTokens = async (userId, type) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        const { unHashedToken, hashedToken, tokenExpiry } =
            generateVerificationToken();

        // attach refresh token to the user document to avoid refreshing the access token with multiple refresh tokens
        if (!type) {
            user.verificationToken = hashedToken;
            user.verificationExpiry = tokenExpiry;
            user.isLoggedIn = false;
        }
        user.refreshToken = refreshToken;

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

    res.cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: newUser, accessToken: accessToken },
                "Please check your email to verify your account!"
            )
        );

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken);
    await emailQueue(userName, email, EmailSendEnum.REGISTER, url);
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isEmailVerified: true });
    if (!user) {
        throw new ApiError(404, "User not found!");
    }
    await redisClient.del(`user:${user._id}`);

    const isValidPassword = await user.isPasswordCorrect(password);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password!");
    }

    const { accessToken, refreshToken, unHashedToken } =
        await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select(UserSecureSelect);

    res.cookie("accessToken", accessToken, cookieOptions)
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

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken);
    await emailQueue(loggedInUser.userName, email, EmailSendEnum.LOGIN, url);
});

const verifyUser = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) {
        throw new ApiError(400, "Email verification token is missing");
    }

    // generate a hash from the token that we are receiving
    let hashedToken = cryptoTokenVerify(token);

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
        }
    ).select(UserSecureSelect);
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

    const { MPIN } = req.body;

    // Encrypt the incoming MPIN
    const { encrypted, key, iv } = encryptMPIN(MPIN);

    // Convert key and iv to hex strings for storage
    const keyHex = key.toString("hex");
    const ivHex = iv.toString("hex");

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                mPin: {
                    code: encrypted,
                    key: keyHex,
                    iv: ivHex,
                    enabled: true,
                },
            },
        },
        {
            new: true,
        }
    ).select(UserSecureSelect);

    res.status(200).json(
        new ApiResponse(200, {}, "MPIN Updated SuccessFully!")
    );

    // Add Email To Queue
    await emailQueue(user.userName, user.email, EmailSendEnum.MPIN_UPDATED);
});

const forgetPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email, isEmailVerified: true });
    if (!user) {
        throw new ApiError(401, "User Not Found!");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        generateVerificationToken();

    user.resetPasswordToken = hashedToken;
    user.resetPasswordTokenExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    res.status(201).json(
        new ApiResponse(
            201,
            {},
            "Please Check Your Email Inbox To Reset Your Password!"
        )
    );

    // Add Email To Queue
    const url = verificationUrl(req, unHashedToken, "forgot");
    await emailQueue(user.userName, email, EmailSendEnum.REGISTER, url);
});

const resetPassword = asyncHandler(async (req, res) => {
    const { password, resetToken } = req.body;

    const hashedToken = cryptoTokenVerify(resetToken);

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpiry: { $gt: Date.now() },
    });
    if (!user) {
        throw new ApiError(401, "Invalid Token!");
    }

    Object.assign(user, {
        password: password,
        resetPasswordToken: undefined,
        resetPasswordTokenExpiry: undefined,
    });
    await user.save({ validateBeforeSave: false });

    res.status(201).json(
        new ApiResponse(201, {}, "Your password has been changed successfully!")
    );

    // Add Email To Queue
    await emailQueue(user.userName, user.email, EmailSendEnum.RESET_PASSWORD);
});

// const userHaveOTP = asyncHandler(async (req, res) => {
//     const { userId } = req.params;
//     if (!userId) {
//         throw new ApiError(400, "User ID is required!");
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//         throw new ApiError(404, "User Not Found!");
//     }

//     const youHaveOTP = user.verificationCode.code.length === 6 ? true : false;

//     return res
//         .status(200)
//         .json({ message: "Request Processed!", exists: youHaveOTP });
// });

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

        const user = await User.findOne({
            _id: decodedToken?._id,
            refreshToken: incomingRefreshToken,
            isEmailVerified: true,
        });
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id, "refresh");

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
    resetPassword,
    refreshAccessToken,
};
