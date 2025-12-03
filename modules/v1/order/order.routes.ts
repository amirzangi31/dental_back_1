import express from "express";
import { auth } from "../../../middleware/auth";
import { createOrder, getOrderWithId, updateOrder } from "./order.controller";

const router = express.Router();

router.post("/order", auth, createOrder);
router.get("/order/:id", auth, getOrderWithId); 
router.put("/order/:id", auth, updateOrder);

export default router;
