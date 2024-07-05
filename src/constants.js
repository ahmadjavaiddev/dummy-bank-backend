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
