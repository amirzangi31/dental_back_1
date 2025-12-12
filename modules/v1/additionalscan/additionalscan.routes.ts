import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createAdditionalscan,
  deleteAdditionalscan,
  getAdditionalscan,
  getAdditionalscanByCategory,
  getAdditionalscanDropdown,
  updateAdditionalscan,
} from "./additionalscan.controller";
import { validate } from "../../../middleware/schemaValidate";

import { uploadSingle } from "../../../middleware/upload";
import {
  createAdditionalscanSchema,
  updateAdditionalscanSchema,
} from "../../../db/validations/additionalscan";

const router = express.Router();

router.get("/additionalscans", auth, getAdditionalscan);
router.post(
  "/additionalscan",
  auth,
  uploadSingle("file"),
  validate(createAdditionalscanSchema),
  createAdditionalscan
);
router.put(
  "/additionalscan/:id",
  auth,
  uploadSingle("file"),
  validate(updateAdditionalscanSchema),
  updateAdditionalscan
);
router.get("/additionalscans/dropdown", auth, getAdditionalscanDropdown);
router.get("/additionalscans/category/:category", auth, getAdditionalscanByCategory);
router.delete("/additionalscan/:id", auth, deleteAdditionalscan);

export default router;
