import * as yup from "yup";

export const createImplantSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup.string(),
  color: yup.number(),
  file: yup.string(), 
});

export const updateImplantSchema = yup.object().shape({
  title: yup.string(),
  price: yup.string(),
  color: yup.number(),
  file: yup.string(), 
});
