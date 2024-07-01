import mongoose from "mongoose";

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
        verified: {
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
                enum: ["LOGIN", "REGISTER"],
            },
            expiry: {
                type: Date,
            },
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
        verifiedIPS: [
            {
                type: {
                    ip: {
                        type: String,
                    },
                    verified: {
                        type: Boolean,
                        default: false,
                    },
                    expiry: {
                        type: Date,
                    },
                },
            },
        ],
        ipVerificationCode: {
            type: String,
            default: null,
        },
        accessToken: {
            type: String,
        },
        accessTokenExpiry: {
            type: Date,
        },
        accessTokenId: {
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

const User = mongoose.model("User", userSchema);

export default User;
