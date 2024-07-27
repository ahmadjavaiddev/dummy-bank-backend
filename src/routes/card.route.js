import express from "express";
import {
    createCard,
    verifyAndCreateCard,
} from "../controllers/card.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import { validate } from "../validator/validate.js";
import {
    cardVerifyValidator,
    createCardValidator,
} from "../validator/card.validator.js";

const router = express.Router();

router
    .route("/create")
    .post(createCardValidator(), validate, verifyJWT, createCard);
router
    .route("/verify/:verificationToken")
    .get(cardVerifyValidator(), validate, verifyAndCreateCard);

export default router;
