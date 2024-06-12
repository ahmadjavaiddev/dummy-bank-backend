import express from "express";
import {
    getUser,
    loginUser,
    registerUser,
    updateUser,
    verifyUserIP,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-ip", verifyUserIP);
router.get("/user", verifyJWT, getUser);
router.patch("/user", verifyJWT, updateUser);

export default router;
