import express from "express";
import {
    approveRequestedPayment,
    clearCache,
    getTransactions,
    rejectRequestedPayment,
    requestMoney,
    requestedTransactions,
    sendMoney,
    transactionVerify,
} from "../controllers/transaction.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
    requestMoneyValidator,
    sendMoneyValidator,
    transactionVerifyValidator,
} from "../validator/transaction.validator.js";
import { validate } from "../validator/validate.js";

const router = express.Router();

router.route("/").get(verifyJWT, getTransactions);
router
    .route("/send")
    .post(verifyJWT, sendMoneyValidator(), validate, sendMoney);
router
    .route("/verify/:verificationToken")
    .get(transactionVerifyValidator(), validate, transactionVerify);
router.route("/cache/clear").get(verifyJWT, clearCache);
router
    .route("/request")
    .post(verifyJWT, requestMoneyValidator(), validate, requestMoney);
router.route("/requested").get(verifyJWT, requestedTransactions);
router
    .route("/requested/approve/:transactionId")
    .get(verifyJWT, approveRequestedPayment);
router
    .route("/requested/reject/:transactionId")
    .get(verifyJWT, rejectRequestedPayment);

export default router;
