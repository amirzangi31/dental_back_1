import express from "express";
import { auth } from "../../../middleware/auth";
import { validate } from "../../../middleware/schemaValidate";


import {
  getTax,
  getTaxById,
  createTax,
  updateTax,
  deleteTax,
} from "./tax.controller";
import { createTaxSchema, updateTaxSchema } from "../../../db/validations/tax";

const router = express.Router();

router.get("/taxs", auth, getTax);
router.get("/tax/:id", auth, getTaxById);
router.post("/tax", auth, validate(createTaxSchema), createTax);
router.put("/tax/:id", auth, validate(updateTaxSchema), updateTax);
router.delete("/tax/:id", auth, deleteTax);

export default router;

