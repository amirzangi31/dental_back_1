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
  isRemember: yup.boolean().optional().default(false),
});
export const signupSchema = yup.object().shape({
  name: yup.string(),
  lastName: yup.string(),
  country: yup.string().required("Country is required"),
  postalCode: yup.string().required("Postal code is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  password: yup.string().when("$isGoogleSignup", {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema.min(8, "Password must be at least 8 characters long").required("Password is required"),
  }),
  confirmPassword: yup.string().when("$isGoogleSignup", {
    is: true,
    then: (schema) => schema.notRequired(),
    otherwise: (schema) => schema
      .min(8, "Confirm Password must be at least 8 characters long")
      .oneOf([yup.ref("password")], "Confirm Password must match Password")
      .required("Confirm Password is required"),
  }),
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

export const forgotPasswordSchema = yup.object().shape({
  email: yup.string().email("Invalid email address").required("Email is required"),
});

export const resetPasswordSchema = yup.object().shape({
  email: yup.string().email("Invalid email address").required("Email is required"),
  otp: yup.string().required("OTP is required"),
  newPassword: yup.string().min(8, "New password must be at least 8 characters long").required("New password is required"),
  confirmPassword: yup
    .string()
    .min(8, "Confirm Password must be at least 8 characters long")
    .oneOf([yup.ref("newPassword")], "Confirm Password must match New Password")
    .required("Confirm Password is required"),
});

export const googleSignInSchema = yup.object().shape({
  idToken: yup.string().required("Google ID token is required"),
});

export const googleAuthSchema = yup.object().shape({
  idToken: yup.string().required("Google ID token is required"),
});

export const createDesignerSchema = yup.object().shape({
    name: yup.string().required("Name is required"),
    lastName: yup.string().required("Last name is required"),
    email: yup.string().email("Invalid email address").required("Email is required"),
    password: yup.string().min(8, "Password must be at least 8 characters long").required("Password is required"),
    country: yup.string().required("Country is required"),
    postalCode: yup.string().required("Postal code is required"),
    phoneNumber: yup.string(),
});

export const updateDesignerSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  lastName: yup.string().required("Last name is required"),
  email: yup.string().email("Invalid email address").required("Email is required"),
  country: yup.string().required("Country is required"),
  postalCode: yup.string().required("Postal code is required"),
  phoneNumber: yup.string(),
  password: yup.string().min(8, "Password must be at least 8 characters long").optional(),
});