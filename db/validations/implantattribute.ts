import * as yup from "yup";

export const createImplantAttributeSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup.number(),
  color: yup.number(),
  // file از multer می‌آید و نیازی به validation در schema نیست
});

export const updateImplantAttributeSchema = yup.object().shape({
  title: yup.string(),
  price: yup.number(),
  color: yup.number(),
  // file از multer می‌آید و نیازی به validation در schema نیست
});

