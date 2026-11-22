import * as yup from "yup";

export const adminWalletIncreaseSchema = yup.object({
  userId: yup.number().integer().min(1).required("userId is required"),
  amount: yup
    .number()
    .integer("amount must be an integer")
    .min(1, "amount must be a positive integer")
    .max(2_000_000_000)
    .required("amount is required"),
  note: yup.string().trim().max(200).optional().nullable(),
});
