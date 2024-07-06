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
import {
    UserSelectSecureSchema,
    UserSelectWithIP,
    cookieOptions,
    fiveDays,
    oneHour,
    sixDigit,
} from "../constants.js";
import { redisClient } from "../utils/redis.js";
import { sendEmail } from "../utils/sendEmail.js";
import {
    generateIBAN,
    generateUniqueAccountNumber,
} from "../utils/generateIban.js";
// import geoip from "geoip-lite";
import geoip from "geoip-country";

const generateToken = async (userId, type) => {
    try {
        const accessTokenId = `${uuid()}-${Date.now()}`;
        const code = sixDigit();
        const oneHourExpiry = oneHour();
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
        user.accessTokenExpiry = oneHourExpiry;

        if (type === "LOGIN") {
            user.verificationCode = {
                code: code,
                type: "LOGIN",
                expiry: oneHourExpiry,
            };
        } else {
            user.verificationCode = {
                code: code,
                type: "REGISTER",
                expiry: oneHourExpiry,
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

    const accountNumber = await generateUniqueAccountNumber();

    const ipAddress = req.clientIp;
    // const ipAddress = "207.97.227.239";
    // Generate IBAN for the user
    const geo = geoip.lookup(ipAddress);
    const country = geo ? geo.country : "DF";
    const IBAN = await generateIBAN(country, "10000000", accountNumber);

    console.log("Geo ::", geo);
    console.log("IBAN ::", IBAN);

    const hashedPassword = await argon2.hash(password);
    const user = await User.create({
        firstName: firstName,
        lastName: lastName,
        userName: userName,
        email: email,
        password: hashedPassword,
        IBAN: IBAN,
        accountNumber: accountNumber,
    });

    const accessToken = await generateToken(user._id, "REGISTER");

    const newUser = await User.findById(user._id).select(UserSelectWithIP);

    // Add Email To Queue
    await sendEmail(
        newUser.userName,
        newUser.email,
        "REGISTER",
        newUser.verificationCode.code
    );

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

    const loggedInUser = await User.findById(user._id).select(UserSelectWithIP);

    await sendEmail(
        loggedInUser.userName,
        loggedInUser.email,
        "LOGIN",
        loggedInUser.verificationCode.code
    );

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
        !verificationCode ||
        !type
    ) {
        throw new ApiError(
            401,
            "User ID, Type and Verification Code is Required!"
        );
    }

    const user = await User.findById(userId);
    if (user.verificationCode.type === "LOGIN" && !user.verified) {
        throw new ApiError(401, "Please Verify you email first!");
    }
    if (user.verificationCode.type === "IP" && !user.verified) {
        throw new ApiError(401, "Please Verify you email first!");
    }

    if (
        !user ||
        user.verificationCode.code !== verificationCode ||
        user.verificationCode.expiry < Date.now() ||
        user.verificationCode.type !== type
    ) {
        throw new ApiError(401, "Invalid Verification Code!");
    }
    const userCodeType = user.verificationCode.type;
    if (type === "LOGIN" && userCodeType === "LOGIN") {
        user.verificationCode.code = "";
        user.verificationCode.expiry = "";
        user.verificationCode.type = "";

        await user.save({ validateBeforeSave: false });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    message: "User Login Verified Successfully!",
                    success: true,
                },
                "User Login Verified Successfully!"
            )
        );
    }

    if (type === "IP" && userCodeType === "IP") {
        const fiveDaysExpiry = fiveDays();
        user.verificationCode.code = "";
        user.verificationCode.expiry = "";
        user.verificationCode.type = "";
        user.lastLoginIP.verified = true;
        user.lastLoginIP.code = "";
        user.lastLoginIP.expiry = fiveDaysExpiry;
        user.ipVerifyEmail.sent = false;
        user.ipVerifyEmail.expiry = "";

        await user.save({ validateBeforeSave: false });

        // Add Email To Queue
        await sendEmail(user.userName, user.email, "IP-VERIFIED");

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    message: "User IP Verified Successfully!",
                    success: true,
                },
                "User IP Verified Successfully!"
            )
        );
    }

    user.verificationCode.code = "";
    user.verificationCode.expiry = "";
    user.verificationCode.type = "";
    user.verified = true;

    await user.save({ validateBeforeSave: false });

    // Add Email To Queue
    await sendEmail(user.userName, user.email, "EMAIL-VERIFIED");

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
    const ipAddress = req.clientIp;

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

    // Add Email To Queue
    await sendEmail(user.userName, user.email, "IP-VERIFIED");

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

const isUserVerified = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    if (!_id) {
        throw new ApiError(400, "User ID required!");
    }

    const cachedUser = await redisClient.get(`user:verified:${_id}`);
    if (cachedUser) {
        const user = JSON.parse(cachedUser);
        return res.status(200).json({
            message: "User Verified!",
            success: true,
            userId: user.userId,
            IP: user.IP,
        });
    }

    const user = await User.findOne({ _id: _id, verified: true }).select(
        UserSelectWithIP
    );
    if (!user) {
        throw new ApiError(401, "User ID required!");
    }

    // if (!user.lastLoginIP.verified && !user.ipVerifyEmail.sent) {
    //     // Generate Verification Code
    //     const verificationCode = sixDigit();
    //     const ipAddress = req.clientIp;
    //     const fifteenMinutesExpiry = fifteenMinutes();

    //     // Set User IP Details In DB
    //     user.verificationCode = {
    //         code: verificationCode,
    //         type: "IP",
    //         expiry: oneHour,
    //     };
    //     user.lastLoginIP = {
    //         ip: ipAddress,
    //         verified: false,
    //     };
    //     user.ipVerifyEmail.sent = true;
    //     user.ipVerifyEmail.expiry = fifteenMinutesExpiry;
    //     await user.save({ validateBeforeSave: false });

    //     // Add Email To Queue
    //     await sendEmail(user.userName, user.email, "IP", verificationCode);
    // }
    if (user.lastLoginIP.verified) {
        const userToCache = {
            userId: user._id,
            IP: user.lastLoginIP.verified,
        };
        await redisClient.set(
            `user:verified:${_id}`,
            JSON.stringify(userToCache),
            "PX",
            1 * 1000 * 60 * 15
        );
    }

    return res.status(200).json({
        message: "User Verified!",
        success: true,
        userId: _id,
        IP: user.lastLoginIP.verified,
    });
});

const userHaveOTP = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        throw new ApiError(400, "User ID is required!");
    }
    console.log("User ID ::", userId);
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(400, "User Not Found!");
    }

    const youHaveOTP = user.verificationCode.code.length === 6 ? true : false;

    return res
        .status(200)
        .json({ message: "Request Processed!", exists: youHaveOTP });
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
    isUserVerified,
    userHaveOTP,
};
