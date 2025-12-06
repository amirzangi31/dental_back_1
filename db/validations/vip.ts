import * as yup from "yup";

export const createVipSchema = yup.object().shape({
  price: yup.string().required("Price is required"),
});

export const updateVipSchema = yup.object().shape({
  price: yup.string(),
});

