import express from "express";
import { auth } from "../../../middleware/auth";
import {
  createDevice,
  deleteDevice,
  getDevice,
  updateDevice,
} from "./device.controller";
import { validate } from "../../../middleware/schemaValidate";

import { uploadSingle } from "../../../middleware/upload";
import {
  createDeviceSchema,
  updateDeviceSchema,
} from "../../../db/validations/device";

const router = express.Router();

router.get("/devices", auth, getDevice);
router.post(
  "/device",
  auth,
  uploadSingle("file"),
  validate(createDeviceSchema),
  createDevice
);
router.put(
  "/device/:id",
  auth,
  uploadSingle("file"),
  validate(updateDeviceSchema),
  updateDevice
);
router.delete("/device/:id", auth, deleteDevice);

export default router;
