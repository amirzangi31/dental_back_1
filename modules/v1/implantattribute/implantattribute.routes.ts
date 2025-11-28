import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createImplantAttribute,
  deleteImplantAttribute,
  getImplantAttribute,
  updateImplantAttribute,
} from "./implantattribute.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  createImplantAttributeSchema,
  updateImplantAttributeSchema,
} from "../../../db/validations/implantattribute";
import { uploadSingle } from "../../../middleware/upload";

const router = express.Router();

router.get("/implantattributes", auth, getImplantAttribute);
router.post("/implantattribute", auth, uploadSingle("file"), validate(createImplantAttributeSchema), createImplantAttribute);
router.put("/implantattribute/:id", auth, uploadSingle("file"), validate(updateImplantAttributeSchema), updateImplantAttribute);
router.delete("/implantattribute/:id", auth, deleteImplantAttribute);

export default router;

