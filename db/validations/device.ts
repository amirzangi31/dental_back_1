import * as yup from "yup";

export const createDeviceSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup.number(),
});

export const updateDeviceSchema = yup.object().shape({
  title: yup.string(),
  price: yup.number(),
});
