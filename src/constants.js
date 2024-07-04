export const UserSelectSecureSchema =
    "-password -accessToken -accessTokenId -accessTokenExpiry -mPin -verifiedIPS -haveCard -balance -virtualCard -ipVerificationCode -__v";
export const UserSelectSchema =
    "-password -accessToken -accessTokenId -accessTokenExpiry -mPin -verifiedIPS -haveCard -balance -virtualCard -__v";

export const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
};

// HOURS OR TIME OR DAY
export const oneHour = new Date(Date.now() + 1 * 1000 * 60 * 60);
export const fifteenMinutes = new Date(Date.now() + 1 * 1000 * 60 * 15);
export const fiveDays = new Date(Date.now() + 1 * 1000 * 60 * 60 * 24 * 5);

// VERIFICATION CODES
export const sixDigit = Math.floor(100000 + Math.random() * 900000);
