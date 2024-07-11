import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
    createNotification,
    getNotifications,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.post("/create", createNotification);
router.get("/get", verifyJWT, getNotifications);

export default router;
