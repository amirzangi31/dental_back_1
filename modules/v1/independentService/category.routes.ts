import express from "express";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
import { validate } from "../../../middleware/schemaValidate";
import {
  createIndependentCategorySchema,
  updateIndependentCategorySchema,
} from "../../../db/validations/independentService";
import {
  createIndependentCategory,
  deleteIndependentCategory,
  independentCategoryDropdown,
  listIndependentCategories,
  updateIndependentCategory,
} from "./category.controller";

const router = express.Router();

router.get("/dropdown", auth, independentCategoryDropdown);
router.get("/", auth, isAdmin, listIndependentCategories);
router.post(
  "/",
  auth,
  isAdmin,
  validate(createIndependentCategorySchema),
  createIndependentCategory,
);
router.put(
  "/:id",
  auth,
  isAdmin,
  validate(updateIndependentCategorySchema),
  updateIndependentCategory,
);
router.delete("/:id", auth, isAdmin, deleteIndependentCategory);

export default router;
