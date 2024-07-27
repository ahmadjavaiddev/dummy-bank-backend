export const UserSecureSelect =
    "-password -mPin -verificationExpiry -verificationToken -resetPasswordToken -resetPasswordTokenExpiry -refreshToken -virtualCard -__v";
export const UserSelectSecureSchema =
    "-password -accessToken -accessTokenId -accessTokenExpiry -mPin -verifiedIPS -haveCard -balance -virtualCard -ipVerificationCode -lastLoginIP -ipVerifyEmail -__v";
export const UserSelectSchema =
    "-password -accessToken -accessTokenId -accessTokenExpiry -mPin -verifiedIPS -haveCard -balance -virtualCard -__v";
export const UserSelectWithIP =
    "-password -accessToken -accessTokenId -accessTokenExpiry -mPin -verifiedIPS -haveCard -virtualCard -__v";

export const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
};

export const TRANSACTION_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes

// HOURS OR TIME OR DAY
export const oneHour = () => {
    const numbers = new Date(Date.now() + 1 * 1000 * 60 * 60);
    return numbers;
};
export const fifteenMinutes = () => {
    const number = new Date(Date.now() + 1 * 1000 * 60 * 15);
    return number;
};
// export const fiveDays = new Date(Date.now() + 1 * 1000 * 60 * 60 * 24 * 5);
export const fiveDays = () => {
    const numbers = new Date(Date.now() + 1 * 1000 * 60 * 60 * 24 * 5);
    return numbers;
};

// VERIFICATION CODES
export const sixDigit = () => {
    const code = Math.floor(100000 + Math.random() * 900000);
    return code;
};

export const EmailSendEnum = Object.freeze({
    LOGIN: "LOGIN",
    REGISTER: "REGISTER",
    IP: "IP",
    TRANSACTION_VERIFY: "TRANSACTION_VERIFY",
    EMAIL_VERIFIED: "EMAIL_VERIFIED",
    MPIN_UPDATED: "MPIN_UPDATED",
    FORGOT_PASSWORD: "FORGOT_PASSWORD",
    RESET_PASSWORD: "RESET_PASSWORD",
    CARD_VERIFY: "CARD_VERIFY",
});

export const VerificationCodeEnum = Object.freeze({
    LOGIN: "LOGIN",
    REGISTER: "REGISTER",
    IP: "IP",
});

export const TransactionStatusEnum = Object.freeze({
    PENDING: "PENDING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    QUEUED: "QUEUED",
});

export const TransactionTypeEnum = Object.freeze({
    TRANSFER: "TRANSFER",
    WITHDRAW: "WITHDRAW",
    DEPOSIT: "DEPOSIT",
    REQUEST: "REQUEST",
});

export const NotificationTypeEnum = Object.freeze({
    LOGIN: "LOGIN",
    TRANSACTION: "TRANSACTION",
    MPIN: "MPIN",
    CARD: "CARD",
    PAYMENT: "PAYMENT",
});

export const NotificationStatusEnum = Object.freeze({
    COMPLETED: "COMPLETED",
    QUEUED: "QUEUED",
    FAILED: "FAILED",
    RECEIVED: "RECEIVED",
    CREATED: "CREATED",
    FREEZE: "FREEZE",
    UNFREEZE: "UNFREEZE",
    REQUESTED: "REQUESTED",
});
