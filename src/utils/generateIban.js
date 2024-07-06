import User from "../models/user.model.js";

function generateIBAN(countryCode, bankCode, accountNumber) {
    if (!/^[A-Z]{2}$/.test(countryCode)) {
        throw new Error("Invalid country code");
    }
    if (!/^\d+$/.test(bankCode) || !/^\d+$/.test(accountNumber)) {
        throw new Error("Bank code and account number should be numeric");
    }

    const bban = bankCode + accountNumber;
    const rearranged = bban + countryCode + "00";
    const converted = rearranged.replace(/[A-Z]/g, (char) =>
        (char.charCodeAt(0) - 55).toString()
    );

    const checksum = 98n - (BigInt(converted) % 97n);
    const checkDigits = checksum.toString().padStart(2, "0");
    const iban = countryCode + checkDigits + bban;

    return iban;
}

async function generateUniqueAccountNumber() {
    let accountNumber;
    let exists;

    do {
        accountNumber = (
            Math.floor(Math.random() * 9000000000) + 1000000000
        ).toString();
        exists = await User.findOne({ accountNumber });
    } while (exists);

    return accountNumber;
}

export { generateIBAN, generateUniqueAccountNumber };
