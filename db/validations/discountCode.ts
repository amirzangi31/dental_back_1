import * as yup from "yup";

const codeSchema = yup.string().trim().min(2).max(64).required("code is required");

const valueSchema = yup
  .number()
  .integer("value must be an integer")
  .when("kind", {
    is: "percent",
    then: (schema) => schema.min(1).max(100),
    otherwise: (schema) => schema.min(1),
  })
  .required("value is required");

export const createDiscountCodeSchema = yup.object({
  code: codeSchema,
  title: yup.string().trim().max(255).nullable().optional(),
  kind: yup.string().oneOf(["percent", "fixed"]).required("kind is required"),
  value: valueSchema,
  active: yup.boolean().optional(),
  startsAt: yup.date().nullable().optional(),
  expiresAt: yup.date().nullable().optional(),
  maxUses: yup.number().integer().min(1).nullable().optional(),
});

export const updateDiscountCodeSchema = createDiscountCodeSchema;

export const checkDiscountCodeSchema = yup.object({
  code: codeSchema,
  beforeTaxToman: yup.number().min(0).required("beforeTaxToman is required"),
});
