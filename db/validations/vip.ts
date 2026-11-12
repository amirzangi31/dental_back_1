import * as yup from "yup";

const timeSchema = yup
  .string()
  .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Invalid time");

export const createVipSchema = yup.object().shape({
  price: yup.string().optional(),
  percent: yup.string().required("percent is required"),
  description: yup.string().optional(),
  startTime: timeSchema.required("startTime is required"),
  endTime: timeSchema.required("endTime is required"),
});

export const updateVipSchema = yup.object().shape({
  price: yup.string().optional(),
  percent: yup.string().optional(),
  description: yup.string().optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
});

