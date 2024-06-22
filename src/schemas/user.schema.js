import { z } from "zod";

const registerSchema = z.object({
    firstName: z
        .string()
        .min(3, { message: "firstName at least 3 characters long" }),
    lastName: z
        .string()
        .min(3, { message: "lastName at least 3 characters long" }),
    userName: z
        .string()
        .min(3, { message: "lastName at least 3 characters long" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z
        .string()
        .min(6, { message: "Password at least 6 characters long" }),
});

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
        .string()
        .min(6, { message: "Password at least 6 characters long" }),
});

const updateUserSchema = z.object({
    firstName: z
        .string()
        .min(3, { message: "firstName at least 3 characters long" }),
    lastName: z
        .string()
        .min(3, { message: "lastName at least 3 characters long" }),
});

const UpdateMPINSchema = z
    .string()
    .length(6, { message: "MPIN at least 6 digits long" });

export { registerSchema, loginSchema, updateUserSchema, UpdateMPINSchema };
