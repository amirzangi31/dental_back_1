import express from "express";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
import { validate } from "../../../middleware/schemaValidate";
import { sellerProfileSchema } from "../../../db/validations/sellerProfile";
import { getSellerProfile, putSellerProfile } from "./sellerProfile.controller";

const router = express.Router();

router.get("/seller-profile", auth, isAdmin, getSellerProfile);
router.put(
  "/seller-profile",
  auth,
  isAdmin,
  validate(sellerProfileSchema),
  putSellerProfile,
);

export default router;
