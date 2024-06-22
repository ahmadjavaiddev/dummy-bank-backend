import { z } from "zod";

const sendMoneySchema = z.object({
    receiverEmail: z.string().email({ message: "Invalid email address" }),
    amount: z.number().min(2, { message: "Amount at least 2 DIGITS long" }),
    description: z
        .string()
        .min(5, { message: "Description at least 5 DIGITS long" }),
});

const requestMoneySchema = z.object({
    senderEmail: z.string().email({ message: "Invalid email address" }),
    amount: z.number().min(2, { message: "Amount at least 2 DIGITS long" }),
    description: z
        .string()
        .min(5, { message: "Description at least 5 DIGITS long" }),
});

export { sendMoneySchema, requestMoneySchema };
