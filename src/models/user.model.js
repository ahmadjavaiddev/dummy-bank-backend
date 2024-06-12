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
            unique: true,
            lowercase: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        verified: {
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
                },
            },
        ],
        accessToken: {
            type: String,
        },
        accessTokenExpiry: {
            type: Date,
        },
        accessTokenId: {
            type: String,
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
