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

const generateToken = async (userId) => {
    try {
        const accessTokenId = `${uuid()}-${Date.now()}`;
        const accessTokenExpiry = new Date(Date.now() + 1000 * 60 * 60);

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

    const accessToken = await generateToken(user._id);

    const newUser = await User.findById(user._id).select(
        UserSelectSecureSchema
    );

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

    const accessToken = await generateToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        UserSelectSecureSchema
    );

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
    const { userId } = req.user;
    const { ip } = req.body;
    if (ip.trim() === "") {
        throw new ApiError(401, "Provide IP Address!");
    }

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

    if (!user.verified) {
        throw new ApiError(401, "User not verified!");
    }

    user.verifiedIPS.push({
        ip: ip,
        verified: true,
    });

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { message: "IP Verified SuccessFully!", success: true },
                "IP Verified SuccessFully!"
            )
        );
});

const getUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new ApiError(401, "User not found!");
    }

    const user = await User.findOne({ _id: userId, verified: true }).select(
        "-password -accessToken -accessTokenId -accessTokenExpiry"
    );
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

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
