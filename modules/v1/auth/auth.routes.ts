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
  googleAuth,
  googleSignIn,
  createDesigner,
  updateDesigner,
  deleteDesigner,
  getDesigners,
  getByIdDesigner,
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
  googleAuthSchema,
  googleSignInSchema,
  createDesignerSchema,
  updateDesignerSchema,
} from "../../../db/validations/auth";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
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
router.post("/google/signin", validate(googleSignInSchema), googleSignIn);
router.post("/google", validate(googleAuthSchema), googleAuth);

// Designer management routes (admin only)
router.post("/designer", auth, isAdmin, validate(createDesignerSchema), createDesigner);
router.put("/designer/:id", auth, isAdmin, validate(updateDesignerSchema), updateDesigner);
router.delete("/designer/:id", auth, isAdmin, deleteDesigner);
router.get("/designers", auth, isAdmin, getDesigners);
router.get("/designer/:id", auth, isAdmin, getByIdDesigner);
export default router;
  