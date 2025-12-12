import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createVolume,
  deleteVolume,
  getVolume,
  getVolumeByCategory,
  updateVolume,
} from "./volume.controller";
import { validate } from "../../../middleware/schemaValidate";
import {
  createVolumeSchema,
  updateVolumeSchema,
} from "../../../db/validations/volume";

const router = express.Router();

router.get("/volumes", auth, getVolume);
router.post("/volume", auth, validate(createVolumeSchema), createVolume);
router.put("/volume/:id", auth, validate(updateVolumeSchema), updateVolume);
router.delete("/volume/:id", auth, deleteVolume);
router.get("/volumes/category/:category", auth, getVolumeByCategory);
export default router;
