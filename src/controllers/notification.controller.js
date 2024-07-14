import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import Notification from "../models/notification.model.js";
import { SocketMapUsers } from "../socket/index.js";

const createNotification = asyncHandler(async (req, res) => {
    const io = req.app.get("io");
    const notifications = req.body; // Assuming req.body is an array of notifications

    // Validate each notification and create them
    const createdNotifications = await Promise.all(
        notifications.map(async (notificationData) => {
            const { userId, from, to, type, status, message } =
                notificationData;

            const userVerified = await User.findOne({
                _id: userId,
                isEmailVerified: true,
            });
            if (!userVerified) {
                throw new ApiError(400, `User ${userId} is not verified`);
            }

            // Create Notification
            const notification = await Notification.create({
                userId: userId,
                from: from,
                to: to,
                type: type,
                status: status,
                message: message,
            });

            if (!notification) {
                throw new ApiError(400, "Notification not created");
            }

            return notification;
        })
    );

    // Emit notifications via Socket.IO
    createdNotifications.forEach((notification) => {
        const userId = SocketMapUsers[notification.userId];
        console.log("Notification :: userId ::", userId);
        io.to(userId).emit("notifications", notification);
    });

    return res.status(201).json(new ApiResponse(201, null, "Success"));
});

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new ApiError(400, "User Not Found!");
    }

    const notifications = await Notification.find({ userId: user._id });
    if (notifications.length <= 0) {
        throw new ApiError(400, "Notifications Not Found!");
    }
    const sorted = notifications.sort((a, b) => b.createdAt - a.createdAt);

    return res.status(201).json(new ApiResponse(201, sorted, "Success"));
});

export { createNotification, getNotifications };
