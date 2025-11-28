import * as yup from "yup";

export const createMaterialShadeSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup.number(),
  category: yup.string().oneOf(["A", "B", "C", "D"], "Category must be A, B, C, or D"),
  color: yup.number(),
});

export const updateMaterialShadeSchema = yup.object().shape({
  title: yup.string(),
  price: yup.number(),
  category: yup.string().oneOf(["A", "B", "C", "D"], "Category must be A, B, C, or D"),
  color: yup.number(),
});

