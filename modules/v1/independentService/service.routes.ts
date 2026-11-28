import express from "express";
import { auth } from "../../../middleware/auth";
import { isAdmin } from "../../../middleware/isAdmin";
import { validate } from "../../../middleware/schemaValidate";
import { uploadAny } from "../../../middleware/upload";
import {
  createIndependentServiceSchema,
  updateIndependentServiceSchema,
} from "../../../db/validations/independentService";
import { parseIndependentServiceBody } from "./parseBody";
import {
  createIndependentService,
  deleteIndependentService,
  getIndependentService,
  independentServiceCatalog,
  listIndependentServices,
  updateIndependentService,
} from "./service.controller";

const router = express.Router();

router.get("/catalog", auth, independentServiceCatalog);
router.get("/", auth, isAdmin, listIndependentServices);
router.get("/:id", auth, isAdmin, getIndependentService);
router.post(
  "/",
  auth,
  isAdmin,
  uploadAny(),
  parseIndependentServiceBody,
  validate(createIndependentServiceSchema),
  createIndependentService,
);
router.put(
  "/:id",
  auth,
  isAdmin,
  uploadAny(),
  parseIndependentServiceBody,
  validate(updateIndependentServiceSchema),
  updateIndependentService,
);
router.delete("/:id", auth, isAdmin, deleteIndependentService);

export default router;
