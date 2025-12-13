import * as yup from "yup";

export const updateUserSchema = yup.object().shape({
  id: yup.string().required("ID is required"),
  name: yup.string().required("Name is required"),
  lastName: yup.string().required("Last name is required"),
  country: yup.string().required("Country is required"),
  postalCode: yup.string(),
  specaility: yup.string(),
  laboratoryName: yup.string(),
  phoneNumber: yup.string(),
});
