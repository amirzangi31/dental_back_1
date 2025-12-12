import express from "express";
import { auth } from "../../../middleware/auth";
import { uploadSingle } from "../../../middleware/upload";
import {
  createPayment,
  deletePayment,
  getPaymentById,
  getPayments,
  updatePayment,
} from "./payment.controller";

const router = express.Router();

router.get("/payments", auth, getPayments);
router.get("/payment/:id", auth, getPaymentById);
router.post("/payment", auth, uploadSingle("file"), createPayment);
router.put("/payment/:id", auth, uploadSingle("file"), updatePayment);
router.delete("/payment/:id", auth, deletePayment);

export default router;

