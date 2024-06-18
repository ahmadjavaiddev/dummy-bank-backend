import express from "express";
import {
    analytics,
    getTransactions,
    requestMoney,
    requestedTransactions,
    sendMoney,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", getTransactions);
router.post("/send", sendMoney);
router.post("/request", requestMoney);
router.get("/requested", requestedTransactions);
router.get("/analytics", analytics);

export default router;
