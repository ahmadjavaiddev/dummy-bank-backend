import { ApiError } from "./ApiError.js";
import { emailQueue } from "./Queue.js";

async function sendEmail(name, { userName, email, type, code }) {
    try {
        let typeText;

        if (type === "REGISTER") {
            typeText = "Verify Your Email to Continue";
        }
        if (type === "LOGIN") {
            typeText = "Login Verification";
        }
        if (type === "EMAIL-VERIFIED") {
            typeText = "Email Verified";
        }
        if (type === "IP-VERIFIED") {
            typeText = "IP Verified";
        }
        if (type === "MPIN-UPDATED") {
            typeText = "MPIN Updated";
        }
        if (type === "FORGOT") {
            typeText = "Forgot Password";
        }
        if (type === "PASSWORD-RESET") {
            typeText = "Password Changed";
        }
        if (type === "IP") {
            typeText = "Verify Your IP Address";
        }

        await emailQueue(name, {
            userName: userName,
            email: email,
            type: type,
            subject: typeText,
            verificationCode: code,
        });

        return;
    } catch (error) {
        console.log("Error while sending email ::", error);
        throw new ApiError(400, "Error while sending email");
    }
}

export { sendEmail };
