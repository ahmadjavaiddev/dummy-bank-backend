import { body } from "express-validator";

const userRegisterValidator = () => {
    return [
        body("firstName")
            .trim()
            .notEmpty()
            .withMessage("firstName is required")
            .isLength({ min: 3 })
            .withMessage("firstName must be at lease 3 characters long"),
        body("lastName")
            .trim()
            .notEmpty()
            .withMessage("lastName is required")
            .isLength({ min: 3 })
            .withMessage("lastName must be at lease 3 characters long"),
        body("userName")
            .trim()
            .notEmpty()
            .withMessage("Username is required")
            .isLowercase()
            .withMessage("Username must be lowercase")
            .isLength({ min: 3 })
            .withMessage("Username must be at lease 3 characters long"),
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("password").trim().notEmpty().withMessage("Password is required"),
    ];
};

export { userRegisterValidator };
