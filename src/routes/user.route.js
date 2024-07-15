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
    userHaveOTP,
    logoutUser,
    refreshAccessToken,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { userRegisterValidator } from "../validator/user.validator.js";
import { validate } from "../validator/validate.js";

const router = express.Router();

router.post("/register", userRegisterValidator(), validate, registerUser);
router.post("/login", loginUser);
router.get("/verify/:token", verifyUser);
router.get("/user", verifyJWT, getUser);
router.get("/logout", verifyJWT, logoutUser);
router.patch("/user", verifyJWT, updateUser);
router.post("/update-mpin", verifyJWT, updateMPIN);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetpassword);
router.get("/have-otp/:userId", userHaveOTP);
router.route("/refresh-token").post(refreshAccessToken);

export default router;
