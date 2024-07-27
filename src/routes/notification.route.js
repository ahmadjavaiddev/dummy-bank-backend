import express from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import { getNotifications } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/get", verifyJWT, getNotifications);

export default router;
