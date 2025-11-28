import * as yup from "yup";

export const createColorSchema = yup.object().shape({
  title: yup.string().required("Title is required").max(255),
  code: yup.string().required("Code is required").max(255),
  category: yup.number().integer().required("Category is required"),
});

export const updateColorSchema = yup.object().shape({
  title: yup.string().max(255),
  code: yup.string().max(255),
  category: yup.number().integer(),
});
