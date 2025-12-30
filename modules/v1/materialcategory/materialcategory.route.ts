import { Router } from "express";
import {
  createMaterialCategory,
  getMaterialCategories,
  getMaterialCategoryById,
  updateMaterialCategory,
  deleteMaterialCategory,
  getMaterialCategoryDropDown,
} from "./materialcategory.controller";
import { createMaterialCategorySchema, updateMaterialCategorySchema } from "../../../db/validations/materialcategory";
import { validate } from "../../../middleware/schemaValidate";

const router = Router();

router.post("/", validate(createMaterialCategorySchema), createMaterialCategory);
router.get("/", getMaterialCategories);
router.get("/:id", getMaterialCategoryById);
router.put("/:id", validate(updateMaterialCategorySchema), updateMaterialCategory);
router.delete("/:id", deleteMaterialCategory);
router.get("/dropdown", getMaterialCategoryDropDown);

export default router;
