import * as yup from "yup";

export const createMaterialSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup
    .string()
    .required("Price is required"),
  color: yup.string().nullable().required("Color is required"),
  descriptionStatus: yup
    .string()
    .oneOf(["none", "file", "text", "all"], "Invalid description status")
    .required("Description status is required"),
  description: yup.string().nullable(),
  file: yup.string().nullable(),
  materialcategory: yup
    .string()
    .nullable()
    .required("Material category is required"),
  category: yup.string().nullable().required("Category is required"),
  parent_id: yup.string().nullable(),
});

export const updateMaterialSchema = yup.object().shape({
  title: yup.string(),
  price: yup.string(),
  color: yup.string().nullable(),
  descriptionStatus: yup
    .string()
    .oneOf(["none", "file", "text", "all"], "Invalid description status"),
  description: yup.string().nullable(),
  file: yup.string().nullable(),
  materialcategory: yup.string().nullable(),
  category: yup.string().nullable(),
  parent_id: yup.string().nullable(),
});
