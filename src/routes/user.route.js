import express from "express";
import {
    updateMPIN,
    getUser,
    loginUser,
    registerUser,
    updateUser,
    forgetPassword,
    resetPassword,
    verifyUser,
    logoutUser,
    refreshAccessToken,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
    forgetPasswordValidator,
    resetPasswordValidator,
    updateMPINValidator,
    updateUserValidator,
    userLoginValidator,
    userRegisterValidator,
    verifyUserValidator,
} from "../validator/user.validator.js";
import { validate } from "../validator/validate.js";

const router = express.Router();

// UNSECURED ROUTES
router.route("/register").post(userRegisterValidator(), validate, registerUser);
router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/verify/:token").get(verifyUserValidator(), validate, verifyUser);
router
    .route("/forgot-password")
    .post(forgetPasswordValidator(), validate, forgetPassword);
router
    .route("/reset-password")
    .post(resetPasswordValidator(), validate, resetPassword);
router.route("/refresh-token").post(refreshAccessToken);

// SECURED ROUTES
router.route("/user").get(verifyJWT, getUser);
router.route("/logout").get(verifyJWT, logoutUser);
router
    .route("/user")
    .patch(verifyJWT, updateUserValidator(), validate, updateUser);
router
    .route("/update-mpin")
    .post(verifyJWT, updateMPINValidator(), validate, updateMPIN);

export default router;
