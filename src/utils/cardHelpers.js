import Card from "../models/card.model.js";

const now = new Date();

function generateExpiryDate() {
    const expiryYear = now.getFullYear() + 3; // 3 years validity
    const expiryMonth = String(now.getMonth() + 1).padStart(2, "0");
    return `${expiryMonth}/${expiryYear}`;
}

function generateIssueDate() {
    const issueMonth = String(now.getMonth() + 1).padStart(2, "0");
    const issueYear = now.getFullYear().toString().slice(-2);
    return `${issueMonth}/${issueYear}`;
}

function generateCVV() {
    return Math.floor(100 + Math.random() * 900).toString();
}

const generateUniqueCard = async () => {
    const digits = "0123456789";
    let cardNumber = "";
    let isUnique = false;

    for (let i = 0; i < 12; i++) {
        cardNumber += digits[Math.floor(Math.random() * 10)];
    }

    while (!isUnique) {
        const userCardNumber = await Card.findOne({ cardNumber });
        if (!userCardNumber) {
            isUnique = true;
        } else {
            cardNumber = "";
            for (let i = 0; i < 12; i++) {
                cardNumber += digits[Math.floor(Math.random() * 10)];
            }
        }
    }

    const expiryDate = generateExpiryDate();
    const issueDate = generateIssueDate();
    const cvv = generateCVV();

    console.log(
        "Card Number, Expiry Date, Issue Date, CVV",
        cardNumber,
        expiryDate,
        issueDate,
        cvv
    );

    return {
        cardNumber: cardNumber,
        expiryDate: expiryDate,
        issueDate: issueDate,
        cvv: cvv,
    };
};

export { generateUniqueCard };
