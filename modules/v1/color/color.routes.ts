import express from "express";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";

import {
  createColor,
  deleteColor,
  getColor,
  getColorDropdown,
  updateColor,
} from "./color.controller";
import {
  createColorSchema,
  updateColorSchema,
} from "../../../db/validations/color";

const router = express.Router();

router.get("/colors", auth, getColor);
router.get("/colors/dropdown", auth, getColorDropdown);
router.post("/color", auth, validate(createColorSchema), createColor);
router.put("/color/:id", auth, validate(updateColorSchema), updateColor);
router.delete("/color/:id", auth, deleteColor);

export default router;
