import cookie from "cookie";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { UserSelectSecureSchema } from "../constants.js";

export const SocketMapUsers = {};

const initializeSocketIO = (io) => {
    return io.on("connection", async (socket) => {
        try {
            const cookies = socket.handshake.headers.cookie
                ? cookie.parse(socket.handshake.headers.cookie)
                : {};

            // If accessToken is not found in cookies, check Authorization header
            let token = cookies.accessToken;
            if (!token) {
                token = socket.handshake.headers.authorization;
            }

            // Validate token presence
            if (!token) {
                throw new ApiError(
                    401,
                    "Un-authorized handshake. Token is missing"
                );
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded?._id).select(
                UserSelectSecureSchema
            );

            // retrieve the user
            if (!user) {
                throw new ApiError(
                    401,
                    "Un-authorized handshake. Token is invalid"
                );
            }
            socket.user = user;

            SocketMapUsers[socket.user._id] = socket.id;
            console.info(
                `User connected: ${socket.user._id} - ${
                    SocketMapUsers[socket.user._id]
                }`
            );

            socket.on("disconnect", () => {
                delete SocketMapUsers[socket.user._id];
                console.info(`User disconnected: ${socket.user._id}`);
            });
        } catch (error) {
            socket.emit(
                "socket-error",
                error?.message ||
                    "Something went wrong while connecting to the socket."
            );
            throw new ApiError(401, error?.message);
        }
    });
};

export { initializeSocketIO };
