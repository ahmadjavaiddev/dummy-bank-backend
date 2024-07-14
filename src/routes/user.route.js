import express from "express";
import {
    updateMPIN,
    getUser,
    loginUser,
    registerUser,
    updateUser,
    forgetPassword,
    resetpassword,
    verifyUser,
    // isUserVerified,
    userHaveOTP,
    logoutUser,
    refreshAccessToken,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import verifyUserId from "../middlewares/verify.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyUser);
router.get("/user", verifyJWT, getUser);
router.get("/logout", verifyJWT, logoutUser);
router.patch("/user", verifyJWT, updateUser);
router.post("/update-mpin", verifyJWT, updateMPIN);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetpassword);
// router.get("/check-verify-user", verifyUserId, isUserVerified);
router.get("/have-otp/:userId", userHaveOTP);
router.route("/refresh-token").post(refreshAccessToken);

export default router;
