import { body, param } from "express-validator";

const createCardValidator = () => {
    return [
        body("pinCode")
            .exists()
            .withMessage("pinCode is required")
            .isString()
            .withMessage("pinCode must be a string")
            .isLength({ min: 6, max: 6 }),
    ];
};

const cardVerifyValidator = () => {
    return [
        param("verificationToken")
            .isLength({ min: 40, max: 40 })
            .withMessage(
                "Verification token must be exactly 40 characters long"
            ),
    ];
};

export { createCardValidator, cardVerifyValidator };
