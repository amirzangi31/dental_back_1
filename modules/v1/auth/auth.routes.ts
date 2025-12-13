import express from "express";
import {
  logout,
  refreshToken,
  sendemail,
  signin,
  signup,
  updateUser,
  user,
  verifyemail,
  forgotPassword,
  resetPassword,
} from "./auth.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  refreshTokenSchema,
  sendemailSchema,
  signinSchema,
  signupSchema,
  verifyemailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../../db/validations/auth";
import { auth } from "../../../middleware/auth";
import { updateUserSchema } from "../../../db/validations/users";

const router = express.Router();

router.post("/sendemail", validate(sendemailSchema), sendemail);
router.post("/signup", validate(signupSchema), signup);
router.post("/verifyemail", validate(verifyemailSchema), verifyemail);
router.post("/refreshtoken",   validate(refreshTokenSchema), refreshToken);
router.post("/signin",  validate(signinSchema), signin);
router.post("/logout", auth, logout);
router.get("/user", auth, user); 
router.put("/updateuser", auth, validate(updateUserSchema), updateUser);
router.post("/forgotpassword", validate(forgotPasswordSchema), forgotPassword);
router.post("/resetpassword", validate(resetPasswordSchema), resetPassword);
export default router;
  