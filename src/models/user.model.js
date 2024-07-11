import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import argon2 from "argon2";

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, "First name is required"],
            trim: true,
        },
        lastName: {
            type: String,
            required: false,
            trim: true,
        },
        userName: {
            type: String,
            required: [true, "Last name is required"],
            unique: [true, "UserName Should be unique"],
            lowercase: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: [true, "Email Should be unique"],
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        IBAN: {
            type: String,
            required: [true, "IBAN is required"],
            unique: [true, "IBAN should be Unique"],
        },
        accountNumber: {
            type: String,
            required: [true, "accountNumber is required"],
            unique: [true, "accountNumber should be Unique"],
        },
        mPin: {
            code: {
                type: String,
                default: "",
            },
            enabled: {
                type: Boolean,
                default: false,
            },
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isLoggedIn: {
            type: Boolean,
            default: false,
        },
        verificationCode: {
            code: {
                type: String,
            },
            type: {
                type: String,
                default: "LOGIN",
                enum: ["LOGIN", "REGISTER", "IP"],
            },
            expiry: {
                type: Date,
            },
        },
        resetPasswordToken: {
            type: String,
        },
        resetPasswordTokenExpiry: {
            type: Date,
        },
        haveCard: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            default: "user",
            enum: ["user", "admin"],
        },
        refreshToken: {
            type: String,
        },
        balance: {
            type: Number,
            default: 0,
        },
        virtualCard: {
            number: String,
            expiry: Date,
            cvv: String,
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await argon2.hash(this.password);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await argon2.verify(this.password, password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const User = mongoose.model("User", userSchema);

export default User;
