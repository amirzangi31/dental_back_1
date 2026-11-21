import express from "express";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
import { validate } from "../../../middleware/schemaValidate";
import {
  checkDiscountCodeSchema,
  createDiscountCodeSchema,
  updateDiscountCodeSchema,
} from "../../../db/validations/discountCode";
import {
  checkDiscountCode,
  createDiscountCode,
  deleteDiscountCode,
  getDiscountCode,
  listDiscountCodes,
  updateDiscountCode,
} from "./discountCode.controller";

const router = express.Router();

router.post("/check", auth, validate(checkDiscountCodeSchema), checkDiscountCode);
router.get("/", auth, isAdmin, listDiscountCodes);
router.get("/:id", auth, isAdmin, getDiscountCode);
router.post("/", auth, isAdmin, validate(createDiscountCodeSchema), createDiscountCode);
router.put(
  "/:id",
  auth,
  isAdmin,
  validate(updateDiscountCodeSchema),
  updateDiscountCode,
);
router.delete("/:id", auth, isAdmin, deleteDiscountCode);

export default router;
