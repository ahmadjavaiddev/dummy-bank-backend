import express from "express";
import {
    getTransactions,
    requestMoney,
    requestedTransactions,
    sendMoney,
    transactionVerify,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

// router.use(verifyJWT);

router.get("/", verifyJWT, getTransactions);
router.post("/send", verifyJWT, sendMoney);
router.get("/verify/:verificationToken", transactionVerify);
router.post("/request", verifyJWT, requestMoney);
router.get("/requested", verifyJWT, requestedTransactions);

export default router;
