import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { UserSelectSecureSchema } from "../constants.js";

const verifyUserId = async (req, _, next) => {
    try {
        // Extract the token from cookies or Authorization header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return next(new ApiError(401, "Authentication token not found."));
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID
        const user = await User.findById(decoded._id);
        if (!user) {
            return next(new ApiError(401, "Authentication failed."));
        }
        // Check user verification status and token validity
        const isTokenValid = decoded.accessTokenId === user.accessTokenId;
        if (
            !user.verified ||
            user.accessTokenExpiry < Date.now() ||
            !isTokenValid
        ) {
            return next(new ApiError(401, "Invalid authentication token."));
        }

        // Fetch User Without The Some Important Fields
        const verifiedUser = await User.findById(user._id).select(
            UserSelectSecureSchema
        );

        // Attach the user to the request object
        req.user = verifiedUser;
        next();
    } catch (error) {
        // Pass the error to the next middleware
        next(new ApiError(401, "Invalid access token."));
    }
};

export default verifyUserId;
