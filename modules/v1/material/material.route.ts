import {
  createMaterial,
  getMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  getMaterialDropDown,
} from "./material.controller";
import { createMaterialSchema, updateMaterialSchema } from "../../../db/validations/material";
import { validate } from "../../../middleware/schemaValidate";
import { uploadSingle } from "../../../middleware/upload";
import express from "express";
const router = express.Router();


router.get("/materials", getMaterials);
router.post("/", uploadSingle("file"), validate(createMaterialSchema), createMaterial);
router.get("/dropdown", getMaterialDropDown);
router.get("/:id", getMaterialById);
router.put("/:id", uploadSingle("file"), validate(updateMaterialSchema), updateMaterial);
router.delete("/:id", deleteMaterial);
export default router;
