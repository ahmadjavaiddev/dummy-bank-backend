import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

const cookieOptions = {
    httpOnly: true,
    secure: true,
};

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
    const { firstName, lastName, userName, email, password } = req.body;
    if (
        [firstName, lastName, userName, email, password].some(
            (field) => field.trim() === ""
        )
    ) {
        throw new ApiError(401, "Provide all fields!");
    }

    const existingUser = await User.findOne({ userName, email });
    if (existingUser) {
        throw new ApiError(401, "User already exists!");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        firstName: firstName,
        lastName: lastName,
        userName: userName,
        email: email,
        password: hashedPassword,
    });

    const accessToken = await generateToken(user._id);

    const newUser = await User.findById(user._id).select(
        "-password -accessToken -accessTokenId -accessTokenExpiry "
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
    const { email, password } = req.body;
    if (email.trim() === "" || password.trim() === "") {
        throw new ApiError(401, "Provide all fields!");
    }

    const user = await User.findOne({ email, verified: true });
    if (!user) {
        throw new ApiError(401, "User not found!");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
        throw new ApiError(401, "Invalid password!");
    }

    const accessToken = await generateToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -accessToken -accessTokenId -accessTokenExpiry"
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
        "-password -accessToken -accessTokenId -accessTokenExpiry "
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

    const { firstName, lastName } = req.body;
    if ([firstName, lastName].some((field) => field.trim() === "")) {
        throw new ApiError(401, "Provide all fields!");
    }

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
    ).select("-password -accessToken -accessTokenId -accessTokenExpiry");

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

export { registerUser, loginUser, verifyUserIP, getUser, updateUser };
