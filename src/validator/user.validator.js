import { body, param } from "express-validator";

const userRegisterValidator = () => {
    return [
        body("firstName")
            .trim()
            .notEmpty()
            .withMessage("FirstName is required")
            .isLength({ min: 3 })
            .withMessage("FirstName must be at lease 3 characters long"),
        body("lastName")
            .trim()
            .notEmpty()
            .withMessage("LastName is required")
            .isLength({ min: 3 })
            .withMessage("LastName must be at lease 3 characters long"),
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

const userLoginValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is Required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("password").trim().notEmpty().withMessage("Password is Required"),
    ];
};

const verifyUserValidator = () => {
    return [param("token").trim().notEmpty().withMessage("Token is Required")];
};

const updateUserValidator = () => {
    return [
        body("firstName")
            .trim()
            .notEmpty()
            .withMessage("FirstName is required")
            .isLength({ min: 3 })
            .withMessage("FirstName must be at lease 3 characters long"),
        body("lastName")
            .trim()
            .notEmpty()
            .withMessage("LastName is required")
            .isLength({ min: 3 })
            .withMessage("LastName must be at lease 3 characters long"),
    ];
};

const updateMPINValidator = () => {
    return [
        body("MPIN")
            .trim()
            .notEmpty()
            .withMessage("MPIN is required")
            .isLength({ min: 6, max: 6 })
            .withMessage("MPIN must be 6 digits")
            .isNumeric()
            .withMessage("MPIN must contain only digits"),
    ];
};

const forgetPasswordValidator = () => {
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
    ];
};

const resetPasswordValidator = () => {
    return [
        body("password").trim().notEmpty().withMessage("Password is Required"),
        body("resetToken")
            .trim()
            .notEmpty()
            .withMessage("Reset Token is Required"),
    ];
};

export {
    userRegisterValidator,
    userLoginValidator,
    verifyUserValidator,
    updateUserValidator,
    forgetPasswordValidator,
    resetPasswordValidator,
    updateMPINValidator,
};
