import User from "../models/user.model.js";

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

async function generateIBAN() {
    if (!/^[A-Z]{2}$/.test("DF")) {
        throw new Error("Invalid country code");
    }

    const accountNumber = await generateUniqueAccountNumber();
    if (!/^\d+$/.test("10000000") || !/^\d+$/.test(accountNumber)) {
        throw new Error("Bank code and account number should be numeric");
    }

    const bban = "10000000" + accountNumber;
    const rearranged = bban + "DF" + "00";
    const converted = rearranged.replace(/[A-Z]/g, (char) =>
        (char.charCodeAt(0) - 55).toString()
    );

    const checksum = 98n - (BigInt(converted) % 97n);
    const checkDigits = checksum.toString().padStart(2, "0");
    const IBAN = "DF" + checkDigits + bban;

    return { IBAN, accountNumber };
}

export { generateIBAN };
