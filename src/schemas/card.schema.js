import { z } from "zod";

const createCardSchema = z
    .string()
    .length(4, { message: "Card Code should be at least 4 digits long" });

export { createCardSchema };
