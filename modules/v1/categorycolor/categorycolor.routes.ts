import express from "express";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";

import {
  createCategoryColor,
  deleteCategoryColor,
  getCategoryColor,
  updateCategoryColor,
} from "./categorycolor.controller";
import {
  createCategoryColorSchema,
  updateCategoryColorSchema,
} from "../../../db/validations/categorycolor";

const router = express.Router();

router.get("/categorycolors", auth, getCategoryColor);
router.post(
  "/categorycolor",
  auth,
  validate(createCategoryColorSchema),
  createCategoryColor
);
router.put(
  "/categorycolor/:id",
  auth,
  validate(updateCategoryColorSchema),
  updateCategoryColor
);
router.delete("/categorycolor/:id", auth, deleteCategoryColor);

export default router;
 