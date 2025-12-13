import * as yup from "yup";


export const sendemailSchema = yup.object().shape({
  email: yup.string().email("Invalid email address").required("Email is required"),
});


export const verifyemailSchema = yup.object().shape({
  email: yup.string().email("Invalid email address").required("Email is required"),
  otp: yup.string().required("OTP is required"),
});

export const refreshTokenSchema = yup.object().shape({
  refresh: yup.string().required("Refresh token is required"),
});
export const signinSchema = yup.object().shape({
  email: yup.string().email("Invalid email address").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
});
export const signupSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  lastName: yup.string().required("Last name is required"),
  country: yup.string().required("Country is required"),
  postalCode: yup.string().required("Postal code is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  password: yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
  confirmPassword: yup
    .string()
    .min(8, "Confirm Password must be at least 8 characters long")
    .oneOf([yup.ref("password")], "Confirm Password must match Password")
    .required("Confirm Password is required"),
  sessionId: yup.string().required("Session Id is required"),
  role: yup.string().required("Role is required"),
  specaility: yup.string().when("role", {
    is: (val: string) => val === "doctor",
    then: (schema) => schema.required("Speciality is required for doctors"),
    otherwise: (schema) => schema.notRequired()
  }),
  laboratoryName: yup.string().when("role", {
    is: (val: string) => val === "labrator",
    then: (schema) => schema.required("Laboratory name is required for labrators"),
    otherwise: (schema) => schema.notRequired()
  })
});
