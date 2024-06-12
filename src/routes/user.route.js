import express from "express";
import {
    getUser,
    loginUser,
    registerUser,
    verifyUserIP,
} from "../controllers/user.controller.js";
// import { verify } from "jsonwebtoken";
import verifyJWT from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-ip", verifyUserIP);
router.get("/user", verifyJWT, getUser);

export default router;
