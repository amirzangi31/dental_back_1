import * as yup from "yup";

const optionalText = (max: number) =>
  yup.string().trim().max(max).nullable().notRequired();

export const sellerProfileSchema = yup.object().shape({
  name: optionalText(255),
  economicNumber: optionalText(64),
  nationalId: optionalText(64),
  registrationNumber: optionalText(64),
  postalCode: optionalText(20),
  city: optionalText(100),
  address: optionalText(2000),
  phone: optionalText(30),
});
