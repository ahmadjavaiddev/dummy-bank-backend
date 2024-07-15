import { body, param } from "express-validator";

const sendMoneyValidator = () => {
    return [
        body("receiverEmail")
            .trim()
            .notEmpty()
            .withMessage("Receiver email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("amount")
            .trim()
            .notEmpty()
            .withMessage("Amount is required")
            .isNumeric()
            .withMessage("Amount must be a number")
            .isInt({ min: 1 })
            .withMessage("Amount must be greater than 0"),
        body("description")
            .trim()
            .notEmpty()
            .withMessage("Description is required")
            .isLength({ min: 5 })
            .withMessage("Description must be at least 5 characters long"),
    ];
};

const requestMoneyValidator = () => {
    return [
        body("senderEmail")
            .trim()
            .notEmpty()
            .withMessage("Sender email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("amount")
            .trim()
            .notEmpty()
            .withMessage("Amount is required")
            .isNumeric()
            .withMessage("Amount must be a number")
            .isInt({ min: 1 })
            .withMessage("Amount must be greater than 0"),
        body("description")
            .trim()
            .notEmpty()
            .withMessage("Description is required")
            .isLength({ min: 5 })
            .withMessage("Description must be at least 5 characters long"),
    ];
};

const transactionVerifyValidator = () => {
    return [
        param("verificationToken")
            .isLength({ min: 40, max: 40 })
            .withMessage(
                "Verification token must be exactly 40 characters long"
            ),
    ];
};

export {
    sendMoneyValidator,
    transactionVerifyValidator,
    requestMoneyValidator,
};
