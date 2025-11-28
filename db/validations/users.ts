import * as yup from "yup";

export const updateUserSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  lastName: yup.string().required("Last name is required"),
  country: yup.string().required("Country is required"),
  postalCode: yup.string().required("Postal code is required"),
  specaility: yup.string().required("Speciality is required"),
  laboratoryName: yup.string().required("Laboratory name is required"),
  phoneNumber: yup.string().required("Phone number is required"),
});
