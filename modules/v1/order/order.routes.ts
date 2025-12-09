import express from "express";
import { auth } from "../../../middleware/auth";
import {
  changeOrderStatus,
  createOrder,
  getOrderWithId,
  orderDropDown,
  orderList,
  orderListAdmin,
  submitOrder,
  updateOrder,
} from "./order.controller";
import { uploadSingle } from "../../../middleware/upload";

const router = express.Router();

router.post("/order", auth, createOrder);
router.get("/order/:id", auth, getOrderWithId);
router.put("/order/:id", auth, updateOrder);
router.put("/submitorderwithuser/:id", auth, uploadSingle("file"), submitOrder);
router.get("/orderlist", auth, orderList);
router.get("/orders/dropdown", auth, orderDropDown);
router.get("/orderlistadmin", auth, orderListAdmin);
router.put("/changeorderstatus", auth, uploadSingle("file"), changeOrderStatus);
export default router;
