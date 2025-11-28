import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createCategory,
  deleteCategory,
  getCategory,
  updateCategory,
} from "./category.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../../../db/validations/category";
import { uploadSingle } from "../../../middleware/upload";
import { isAdmin } from "../../../middleware/isAdmin";

const router = express.Router();

router.get("/categories", auth, getCategory);
router.post("/category", auth, uploadSingle("file"), validate(createCategorySchema), createCategory);
router.put("/category/:id", auth, uploadSingle("file"), validate(updateCategorySchema),  updateCategory);
router.delete("/category/:id", auth, deleteCategory);

export default router;
