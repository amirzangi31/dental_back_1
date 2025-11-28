import express from "express";
import { auth } from "../../../middleware/auth";
import { uploadSingle } from "../../../middleware/upload";

const router = express.Router();
import {
  getImplant,
  createImplant,
  updateImplant,
  deleteImplant,
  getImplantDropdown,
} from "./implant.controller";

import { validate } from "../../../middleware/schemaValidate";
import { createImplantSchema, updateImplantSchema } from "../../../db/validations/implant";

router.get("/implants", auth, getImplant);
router.get("/implants/dropdown", auth, getImplantDropdown);
router.post("/implant", auth, uploadSingle("file"), validate(createImplantSchema), createImplant);
router.put("/implant/:id", auth, uploadSingle("file"), validate(updateImplantSchema), updateImplant);
router.delete("/implant/:id", auth, deleteImplant);

export default router;
