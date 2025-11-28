import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createMaterialShade,
  deleteMaterialShade,
  getMaterialShade,
  updateMaterialShade,
} from "./materialshade.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  createMaterialShadeSchema,
  updateMaterialShadeSchema,
} from "../../../db/validations/materialshade";

const router = express.Router();

router.get("/materialshades", auth, getMaterialShade);
router.post("/materialshade", auth, validate(createMaterialShadeSchema), createMaterialShade);
router.put("/materialshade/:id", auth, validate(updateMaterialShadeSchema), updateMaterialShade);
router.delete("/materialshade/:id", auth, deleteMaterialShade);

export default router;

