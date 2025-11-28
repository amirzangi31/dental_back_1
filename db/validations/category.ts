import * as yup from "yup";

export const createCategorySchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  description: yup.string(),
  price: yup.number(),
  catalog: yup.number(),
});

export const updateCategorySchema = yup.object().shape({
  title: yup.string(),
  description: yup.string(),
  price: yup.number(),
  catalog: yup.number(),
  // file از multer می‌آید و نیازی به validation در schema نیست
});
