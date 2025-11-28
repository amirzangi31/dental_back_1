import * as yup from "yup";

export const createCategoryColorSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
});

export const updateCategoryColorSchema = yup.object().shape({
  title: yup.string(),
});
