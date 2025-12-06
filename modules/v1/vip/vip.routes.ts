import express from "express";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";
import {
  createVip,
  deleteVip,
  getVip,
  getVipById,
  updateVip,
} from "./vip.controller";
import {
  createVipSchema,
  updateVipSchema,
} from "../../../db/validations/vip";

const router = express.Router();

router.get("/vips", auth, getVip);
router.get("/vip/:id", auth, getVipById);
router.post("/vip", auth, validate(createVipSchema), createVip);
router.put("/vip/:id", auth, validate(updateVipSchema), updateVip);
router.delete("/vip/:id", auth, deleteVip);

export default router;

