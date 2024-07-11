import { z } from "zod";

const createNotificationSchema = z.object({
    type: ["login", "transaction", "mpin", "card", "payment"],
    status: z.enum([
        "completed",
        "queued",
        "failed",
        "received",
        "created",
        "freeze",
        "unfreeze",
        "requested",
    ]),
    message: z.string().min(5, { message: "Message at least 5 DIGITS long" }),
    read: z.boolean(),
});

export { createNotificationSchema };
