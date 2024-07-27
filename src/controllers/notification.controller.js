import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import Notification from "../models/notification.model.js";

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

export { getNotifications };
