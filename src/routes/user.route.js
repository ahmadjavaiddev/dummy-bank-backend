import express from "express";
import {
    updateMPIN,
    getUser,
    loginUser,
    registerUser,
    updateUser,
    verifyUserIP,
    forgetPassword,
    resetpassword,
    verifyUser,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-user", verifyUser);
router.post("/verify-ip", verifyUserIP);
router.get("/user", verifyJWT, getUser);
router.patch("/user", verifyJWT, updateUser);
router.post("/update-mpin", verifyJWT, updateMPIN);
router.post("/forgot-password", forgetPassword);
router.post("/reset-password", resetpassword);

export default router;
