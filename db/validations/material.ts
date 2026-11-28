import * as yup from "yup";

// Multipart forms send booleans as strings. "false" must stay false.
const inputRequiredFlag = () =>
  yup
    .boolean()
    .transform((_value, originalValue) => {
      if (
        originalValue === true ||
        originalValue === "true" ||
        originalValue === "1" ||
        originalValue === 1
      ) {
        return true;
      }
      if (
        originalValue === false ||
        originalValue === "false" ||
        originalValue === "0" ||
        originalValue === 0 ||
        originalValue === "" ||
        originalValue === null ||
        originalValue === undefined ||
        originalValue === "null"
      ) {
        return false;
      }
      return false;
    })
    .default(false);

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
  inputRequired: inputRequiredFlag(),
  description: yup.string().nullable(),
  file: yup.string().nullable(),
  haveRedesign: inputRequiredFlag(),
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
  inputRequired: inputRequiredFlag(),
  description: yup.string().nullable(),
  file: yup.string().nullable(),
  haveRedesign: inputRequiredFlag(),
  materialcategory: yup.string().nullable(),
  category: yup.string().nullable(),
  parent_id: yup.string().nullable(),
});
