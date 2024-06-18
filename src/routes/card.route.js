import express from "express";
import { createCard } from "../controllers/card.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.post("/create", createCard);

export default router;
