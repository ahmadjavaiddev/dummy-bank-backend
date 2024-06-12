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
        user.accessTokenExpiry = new Date(Date.now() + 1000 * 60 * 60);
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

export { registerUser, loginUser };
