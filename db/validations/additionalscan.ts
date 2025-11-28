import * as yup from "yup";


export const createAdditionalscanSchema = yup.object().shape({
  title: yup.string().required("Title is required"),
  price: yup
    .number()
    .typeError("Price must be a number")
    .required("Price is required"),
  color: yup
    .number()
    .typeError("Color must be a number")
    .required("Color is required"),
  // file validation is typically handled by upload middleware, but you can add:
  // file: yup.mixed().required("File is required"),
});

export const updateAdditionalscanSchema = yup.object().shape({
  title: yup.string(),
  price: yup.number().typeError("Price must be a number"),
  color: yup.number().typeError("Color must be a number"),
  // file: yup.mixed(),
});
