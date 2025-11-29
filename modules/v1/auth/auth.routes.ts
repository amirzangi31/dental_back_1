import express from "express";
import {
  logout,
  refreshToken,
  sendemail,
  signin,
  signup,
  user,
  verifyemail,
} from "./auth.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  refreshTokenSchema,
  sendemailSchema,
  signinSchema,
  signupSchema,
  verifyemailSchema,
} from "../../../db/validations/auth";
import { auth } from "../../../middleware/auth";

const router = express.Router();

router.post("/sendemail", validate(sendemailSchema), sendemail);
router.post("/signup", validate(signupSchema), signup);
router.post("/verifyemail", validate(verifyemailSchema), verifyemail);
router.post("/refreshtoken", auth, validate(refreshTokenSchema), refreshToken);
router.post("/signin",  validate(signinSchema), signin);
router.post("/logout", auth, logout);
router.get("/user", auth, user); 
export default router;
