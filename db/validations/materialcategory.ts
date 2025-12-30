import * as yup from "yup";

export const createMaterialCategorySchema = yup.object().shape({
  title: yup.string().required("Title is required"),
});

export const updateMaterialCategorySchema = yup.object().shape({
  title: yup.string(),
});
