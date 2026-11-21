import * as yup from "yup";
import { iranProvinceKeys, isValidIranNationalCode } from "../../utils/iranNationalCode";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalDigits = (label: string) =>
  yup
    .string()
    .transform(emptyToUndefined)
    .optional()
    .matches(/^\d{5,20}$/, { message: `${label} is invalid`, excludeEmptyString: true });

export const updateUserSchema = yup.object().shape({
  id: yup.string().required("ID is required"),
  name: yup.string().required("Name is required"),
  lastName: yup.string().required("Last name is required"),
  country: yup.string().required("Country is required"),
  postalCode: yup.string(),
  specaility: yup.string(),
  laboratoryName: yup.string(),
  phoneNumber: yup.string(),
  nationalCode: yup
    .string()
    .transform(emptyToUndefined)
    .optional()
    .test("iran-national-code", "National code is invalid", (value) =>
      !value || isValidIranNationalCode(value),
    ),
  province: yup
    .string()
    .transform(emptyToUndefined)
    .optional()
    .test(
      "iran-province",
      "Province is invalid",
      (value) => !value || (iranProvinceKeys as readonly string[]).includes(value),
    ),
  taxCode: optionalDigits("Tax code"),
  economicCode: optionalDigits("Economic code"),
});
